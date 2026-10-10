import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { ivaWithholdings, islrWithholdings, withholdingRules } from "@/db/schema";
import { hasRdfCoverage } from "@/modules/rdf/links";
import { renderIvaCertificateHtml, renderIslrCertificateHtml } from "@/modules/reporting/render";
import { renderPdf } from "@/modules/reporting/pdf";
import { uploadAttachment } from "@/modules/attachments/service";

export type Ctx = { companyId: string; userId: string };

/**
 * B31 fail-closed: el PDF lleva BORRADOR salvo regla no sintética de la empresa
 * con cobertura RDF firmada del mismo impuesto y concepto. Ante cualquier duda,
 * el banner se imprime.
 */
export async function isBorrador(
  tx: DrizzleTx, companyId: string, ruleKind: string, conceptId: string | null, ruleVersionId: string | null,
): Promise<boolean> {
  if (!ruleVersionId) return true;
  const [rule] = await tx.select().from(withholdingRules).where(eq(withholdingRules.id, ruleVersionId)).limit(1);
  if (!rule || rule.companyScopeKey !== companyId || rule.synthetic) return true;
  return !(await hasRdfCoverage(tx, { companyId, ruleKind, conceptId }));
}

type IvaSnapshot = {
  certificateNumber: string;
  fechaEmision: string;
  beneficiary: { rif: string; razon: string };
  lines: { invoiceNumber: string; controlNumber: string; taxableBase: string; vatAmount: string; retainedAmount: string }[];
};

/**
 * 2.0.3 §3.6: render DESPUÉS del commit, desde el snapshot guardado (idempotente).
 * Secuencia: leer estado → renderizar (sin TX) → guardar + marcar (TX corta).
 * Si el render falla, el comprobante ya existe (issued) y se reintenta; la
 * serie nunca queda bloqueada por el navegador. Sin TX anidadas.
 */
export async function renderIvaPdf(ctx: Ctx, id: string, attempt = 1): Promise<{ ok: true; attachmentId: string } | { ok: false; error: { code: string; message: string } }> {
  if (attempt > 3) return { ok: false as const, error: { code: "RENDER_FAILED", message: "Render falló 3 veces; reintenta luego." } };
  const head = await withTenant(ctx, async (tx) => {
    const [w] = await tx.select().from(ivaWithholdings).where(eq(ivaWithholdings.id, id)).limit(1);
    if (!w || w.companyId !== ctx.companyId) return null;
    if (w.renderStatus === "done") return "done" as const;
    const borrador = await isBorrador(tx, ctx.companyId, "iva", null, w.ruleVersionId);
    return { snapshot: w.dataSnapshot as unknown as IvaSnapshot, borrador };
  });
  if (!head) return { ok: false as const, error: { code: "NOT_FOUND", message: "No existe." } };
  if (head === "done") return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Ya renderizado; descarga el archivo guardado." } };

  const snap = head.snapshot;
  const lines = snap.lines ?? [];
  const total = lines.reduce((a, l) => (Number(a) + Number(l.retainedAmount)).toFixed(2), "0.00");
  const { html } = renderIvaCertificateHtml({
    certificateNumber: snap.certificateNumber, fechaEmision: snap.fechaEmision,
    agente: "", beneficiario: `${snap.beneficiary.razon} (${snap.beneficiary.rif})`,
    lines, total, borrador: head.borrador,
  });
  let pdf: Buffer;
  try {
    pdf = (await renderPdf(html)).pdf;
  } catch {
    await withTenant(ctx, async (tx) => {
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "render_retry", entityType: "iva_withholding", entityId: id, after: { attempt } }, `tx-render-${id}`);
    });
    return renderIvaPdf(ctx, id, attempt + 1);
  }
  const up = await uploadAttachment(ctx, { entityType: "iva_withholding", entityId: id, originalName: `${snap.certificateNumber}.pdf`, claimedMime: "application/pdf" }, pdf);
  if (!up.ok) return { ok: false as const, error: { code: "UPLOAD_FAILED", message: "No se pudo guardar el PDF." } };
  const hash = createHash("sha256").update(pdf).digest("hex");
  await withTenant(ctx, async (tx) => {
    await tx.update(ivaWithholdings).set({ renderStatus: "done", pdfSha256: hash }).where(eq(ivaWithholdings.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "render_done", entityType: "iva_withholding", entityId: id, after: { sha256: hash } }, `tx-render-${id}`);
  });
  return { ok: true as const, attachmentId: up.id };
}

/** Pendientes de render IVA + ISLR (REP-01; tablero y `render:retry` consumen esto). */
export async function listPendingRenders(ctx: Ctx) {
  return withTenant(ctx, async (tx) => {
    const iva = await tx.select({ id: ivaWithholdings.id, certificateNumber: ivaWithholdings.certificateNumber, issuedAt: ivaWithholdings.issuedAt, renderStatus: ivaWithholdings.renderStatus }).from(ivaWithholdings).where(eq(ivaWithholdings.companyId, ctx.companyId)).limit(200);
    const islr = await tx.select({ id: islrWithholdings.id, certificateNumber: islrWithholdings.certificateNumber, issuedAt: islrWithholdings.issuedAt, renderStatus: islrWithholdings.renderStatus }).from(islrWithholdings).where(eq(islrWithholdings.companyId, ctx.companyId)).limit(200);
    return [
      ...iva.filter((r) => r.renderStatus === "pending").map((r) => ({ ...r, kind: "iva" as const })),
      ...islr.filter((r) => r.renderStatus === "pending").map((r) => ({ ...r, kind: "islr" as const })),
    ];
  });
}

type IslrSnapshot = {
  certificateNumber: string;
  fechaEmision: string;
  fechaRetencion: string;
  beneficiary: { rif: string; razon: string };
  concept: { codigo: string; nombre: string };
  baseSujeta: string;
  porcentaje: string;
  sustraendo: string;
  retainedAmount: string;
};

/**
 * REP-01: mismo patrón que IVA (ADR-027) para ISLR: leer estado → renderizar
 * (sin TX) → guardar + marcar (TX corta). Idempotente. Nota: islr_withholdings
 * no tiene columna pdf_sha256 (solo IVA); el sha vive en el adjunto y en
 * auditoría (`render_done`). Migración futura si el restore drill la exige.
 */
export async function renderIslrPdf(ctx: Ctx, id: string, attempt = 1): Promise<{ ok: true; attachmentId: string } | { ok: false; error: { code: string; message: string } }> {
  if (attempt > 3) return { ok: false as const, error: { code: "RENDER_FAILED", message: "Render falló 3 veces; reintenta luego." } };
  const head = await withTenant(ctx, async (tx) => {
    const [w] = await tx.select().from(islrWithholdings).where(eq(islrWithholdings.id, id)).limit(1);
    if (!w || w.companyId !== ctx.companyId) return null;
    if (w.renderStatus === "done") return "done" as const;
    const borrador = await isBorrador(tx, ctx.companyId, "islr", w.conceptId, w.ruleVersionId);
    return { snapshot: w.dataSnapshot as unknown as IslrSnapshot, borrador };
  });
  if (!head) return { ok: false as const, error: { code: "NOT_FOUND", message: "No existe." } };
  if (head === "done") return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Ya renderizado; descarga el archivo guardado." } };

  const snap = head.snapshot;
  const { html } = renderIslrCertificateHtml({
    certificateNumber: snap.certificateNumber, fechaEmision: snap.fechaEmision, fechaRetencion: snap.fechaRetencion,
    beneficiario: `${snap.beneficiary.razon} (${snap.beneficiary.rif})`,
    concepto: `${snap.concept.codigo} — ${snap.concept.nombre}`,
    baseSujeta: snap.baseSujeta, porcentaje: snap.porcentaje, sustraendo: snap.sustraendo,
    retainedAmount: snap.retainedAmount, borrador: head.borrador,
  });
  let pdf: Buffer;
  try {
    pdf = (await renderPdf(html)).pdf;
  } catch {
    await withTenant(ctx, async (tx) => {
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "render_retry", entityType: "islr_withholding", entityId: id, after: { attempt } }, `tx-render-${id}`);
    });
    return renderIslrPdf(ctx, id, attempt + 1);
  }
  const up = await uploadAttachment(ctx, { entityType: "islr_withholding", entityId: id, originalName: `${snap.certificateNumber}.pdf`, claimedMime: "application/pdf" }, pdf);
  if (!up.ok) return { ok: false as const, error: { code: "UPLOAD_FAILED", message: "No se pudo guardar el PDF." } };
  const hash = createHash("sha256").update(pdf).digest("hex");
  await withTenant(ctx, async (tx) => {
    await tx.update(islrWithholdings).set({ renderStatus: "done" }).where(eq(islrWithholdings.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "render_done", entityType: "islr_withholding", entityId: id, after: { sha256: hash } }, `tx-render-${id}`);
  });
  return { ok: true as const, attachmentId: up.id };
}
