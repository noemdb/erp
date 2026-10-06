import Decimal from "decimal.js";
import { createHash } from "node:crypto";
import { z } from "zod";
import { eq, and, inArray, ne, sql } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { resolvePeriod } from "@/modules/periods/resolve";
import { computeIvaWithholding } from "@/modules/tax-engine/compute";
import { record } from "@/modules/audit/record";
import { appendEmission } from "./emission-ledger";
import {
  companies, parties, partyTaxProfiles, purchaseDocuments,
  ivaWithholdings, ivaWithholdingLines,
} from "@/db/schema";
import { resolveIvaRule } from "./rules";
import { reserveNumber, formatCertificate, periodKeyFor } from "./series";

export type Ctx = { companyId: string; userId: string };
const IdsSchema = z.array(z.string().uuid()).min(1).max(50);
const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function vigente<T extends { effectiveRange: string }>(profiles: T[], date: string): T | undefined {
  return profiles.find((p) => {
    const m = /^\[(.*?),(.*?)\)$/.exec(p.effectiveRange);
    return m && date >= m[1]! && (m[2] === "" || date < m[2]!);
  });
}

async function loadLines(tx: DrizzleTx, ctx: Ctx, purchaseIds: string[], asOf: string) {
  const [company] = await tx.select().from(companies).where(eq(companies.id, ctx.companyId)).limit(1);
  if (!company) throw { code: "NOT_FOUND", message: "Empresa no existe." };
  const rule = await resolveIvaRule(tx, ctx.companyId, asOf);
  const docs = await tx.select().from(purchaseDocuments).where(inArray(purchaseDocuments.id, purchaseIds));
  if (docs.length !== purchaseIds.length) throw { code: "NOT_FOUND", message: "Alguna compra no existe." };

  const used = await tx
    .select({ purchaseDocumentId: ivaWithholdingLines.purchaseDocumentId })
    .from(ivaWithholdingLines)
    .innerJoin(ivaWithholdings, eq(ivaWithholdingLines.withholdingId, ivaWithholdings.id))
    .where(and(eq(ivaWithholdingLines.companyId, ctx.companyId), ne(ivaWithholdings.status, "voided")));
  const usedSet = new Set(used.map((u) => u.purchaseDocumentId));

  const lines = [];
  for (const d of docs) {
    if (d.companyId !== ctx.companyId) throw { code: "FORBIDDEN", message: "Documento de otra empresa." };
    if (d.status !== "validated") throw { code: "VALIDATION_ERROR", message: `Compra ${d.docNumber} no está validada.` };
    if (usedSet.has(d.id)) throw { code: "VALIDATION_ERROR", message: `Compra ${d.docNumber} ya retenida.` };
    const [party] = await tx.select().from(parties).where(eq(parties.id, d.partyId)).limit(1);
    const profiles = await tx.select().from(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, d.partyId));
    const prof = vigente(profiles, d.fechaFiscal);
    const calc = computeIvaWithholding({
      company: { agenteRetencionIva: company.agenteRetencionIva, agenteRetencionIslr: company.agenteRetencionIslr },
      counterparty: {
        tipoPersona: (prof?.tipoPersona ?? "juridica") as "natural" | "juridica",
        residente: prof?.residente ?? true,
        sujetoRetencionIva: prof?.sujetoRetencionIva ?? false,
        sujetoRetencionIslr: prof?.sujetoRetencionIslr ?? false,
      },
      ivaCausado: d.ivaCausado,
      rule: rule ? { ruleVersionId: rule.id, ruleSnapshot: { porcentaje: rule.porcentaje, legalReference: rule.legalReference }, porcentaje: rule.porcentaje } : null,
    });
    if (!calc.applicable) throw { code: "NOT_APPLICABLE", message: `Compra ${d.docNumber}: ${(calc as { reason: string }).reason}.` };
    lines.push({ doc: d, party: party!, calc });
  }
  return { lines, rule };
}

/** Previsualización sin persistir: líneas + total + regla que aplicaría. */
export async function previewIva(ctx: Ctx, purchaseIds: string[], asOf: string) {
  const ids = IdsSchema.safeParse(purchaseIds);
  const f = FechaSchema.safeParse(asOf);
  if (!ids.success || !f.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Entrada inválida." } };
  try {
    return await withTenant(ctx, async (tx) => {
      const { lines, rule } = await loadLines(tx, ctx, ids.data, f.data);
      const total = lines.reduce((a, l) => a.plus(l.calc.retainedAmount), new Decimal(0)).toFixed(2);
      return {
        ok: true as const,
        ruleVersionId: rule?.id ?? null,
        total,
        lines: lines.map((l) => ({
          purchaseDocumentId: l.doc.id, invoiceNumber: l.doc.docNumber, controlNumber: l.doc.controlNumber,
          taxableBase: l.doc.baseImponible, vatAmount: l.doc.ivaCausado,
          retainedAmount: l.calc.retainedAmount, explanation: l.calc.explanation,
        })),
      };
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e) return { ok: false as const, error: e as { code: string; message: string } };
    throw e;
  }
}

/** Emisión transaccional: período → número → snapshot → líneas → auditoría. Fallo = rollback sin consumir número. */
export async function issueIva(ctx: Ctx, purchaseIds: string[], fechaEmision: string, opts?: { replacesId?: string }) {
  const ids = IdsSchema.safeParse(purchaseIds);
  const f = FechaSchema.safeParse(fechaEmision);
  if (!ids.success || !f.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Entrada inválida." } };
  try {
    const res = await withTenant(ctx, async (tx) => {
      // Serializa emisiones concurrentes sobre los mismos documentos: el
      // chequeo "ya retenida" + inserción dejan de ser una carrera.
      for (const pid of ids.data) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`iva-doc:${pid}`}))`);
      }
      if (opts?.replacesId) {
        const [old] = await tx.select().from(ivaWithholdings).where(eq(ivaWithholdings.id, opts.replacesId)).limit(1);
        if (!old || old.companyId !== ctx.companyId) throw { code: "NOT_FOUND", message: "Comprobante a sustituir no existe." };
        if (old.status !== "voided") throw { code: "INVALID_STATE_TRANSITION", message: "Solo se sustituye un comprobante anulado." };
      }
      const { lines, rule } = await loadLines(tx, ctx, ids.data, f.data);
      if (!rule) throw { code: "NOT_APPLICABLE", message: "Sin regla vigente." };
      const periodId = await resolvePeriod(tx, ctx.companyId, f.data);
      const periodKey = periodKeyFor(f.data);
      const n = await reserveNumber(tx, ctx.companyId, "iva_withholding", periodKey);
      const cert = formatCertificate("iva_withholding", periodKey, n);
      const total = lines.reduce((a, l) => a.plus(l.calc.retainedAmount), new Decimal(0)).toFixed(2);
      const snapshot = {
        certificateNumber: cert, fechaEmision: f.data, beneficiary: { rif: lines[0]!.party.rifOriginal, razon: lines[0]!.party.razonSocial },
        rule: { ruleVersionId: rule.id, porcentaje: rule.porcentaje, legalReference: rule.legalReference },
        lines: lines.map((l) => ({ purchaseDocumentId: l.doc.id, invoiceNumber: l.doc.docNumber, controlNumber: l.doc.controlNumber, taxableBase: l.doc.baseImponible, vatAmount: l.doc.ivaCausado, retainedAmount: l.calc.retainedAmount, explanation: l.calc.explanation })),
      };
      const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
      const [h] = await tx
        .insert(ivaWithholdings)
        .values({
          companyId: ctx.companyId, beneficiaryId: lines[0]!.party.id, fiscalPeriodId: periodId,
          certificateNumber: cert, status: "issued", fechaEmision: f.data,
          ruleVersionId: rule.id, ruleSnapshot: snapshot.rule, totalRetained: total,
          issuedBy: ctx.userId, issuedAt: new Date(), pdfSha256: hash, dataSnapshot: snapshot,
          replacesId: opts?.replacesId ?? null,
        })
        .returning({ id: ivaWithholdings.id });
      for (const l of lines) {
        await tx.insert(ivaWithholdingLines).values({
          companyId: ctx.companyId, withholdingId: h!.id, purchaseDocumentId: l.doc.id,
          invoiceNumber: l.doc.docNumber, controlNumber: l.doc.controlNumber,
          taxableBase: l.doc.baseImponible, vatAmount: l.doc.ivaCausado,
          retentionRate: rule.porcentaje, retainedAmount: l.calc.retainedAmount, explanation: l.calc.explanation,
        });
      }
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "issue", entityType: "iva_withholding", entityId: h!.id, after: { cert, total } }, `tx-issue-${h!.id}`);
      return { ok: true as const, id: h!.id, certificateNumber: cert, total, sha256: hash };
    });
    if (res.ok) {
      // Registro externo post-commit (2.0.5 §5.3): best-effort, nunca falla la emisión;
      // el reconcile detecta huecos entre serie DB y ledger.
      try {
        appendEmission({ companyId: ctx.companyId, kind: "iva_withholding", certificateNumber: res.certificateNumber, fechaEmision: f.data, sha256: res.sha256 });
      } catch { /* reconcile lo detecta */ }
    }
    return res;
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code: unknown }).code;
      if (code === "23505") return { ok: false as const, error: { code: "DUPLICATE_DOCUMENT", message: "Certificado duplicado (reintenta)." } };
      if (typeof code === "string") return { ok: false as const, error: e as { code: string; message: string } };
    }
    throw e;
  }
}

/** Anulación: no libera número. Motivo obligatorio. */
export async function voidIva(ctx: Ctx, id: string, reason: string) {
  if (reason.trim().length < 3) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Motivo requerido." } };
  return withTenant(ctx, async (tx) => {
    const [w] = await tx.select().from(ivaWithholdings).where(eq(ivaWithholdings.id, id)).limit(1);
    if (!w || w.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Comprobante no existe." } };
    if (w.status !== "issued" && w.status !== "delivered")
      return { ok: false as const, error: { code: "INVALID_STATE_TRANSITION", message: `No anulable desde ${w.status}.` } };
    await tx.update(ivaWithholdings).set({ status: "voided", voidedAt: new Date(), voidReason: reason }).where(eq(ivaWithholdings.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "void", entityType: "iva_withholding", entityId: id, before: { status: w.status }, after: { status: "voided" }, reason }, `tx-void-${id}`);
    return { ok: true as const };
  });
}

/** Entrega al beneficiario: issued → delivered + fecha. Plazo parametrizable (pendiente valor contador). */
export async function deliverIva(ctx: Ctx, id: string, fechaEntrega: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega)) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Fecha inválida." } };
  return withTenant(ctx, async (tx) => {
    const [w] = await tx.select().from(ivaWithholdings).where(eq(ivaWithholdings.id, id)).limit(1);
    if (!w || w.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Comprobante no existe." } };
    if (w.status !== "issued") return { ok: false as const, error: { code: "INVALID_STATE_TRANSITION", message: `No entregable desde ${w.status}.` } };
    await tx.update(ivaWithholdings).set({ status: "delivered", fechaEntrega }).where(eq(ivaWithholdings.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "deliver", entityType: "iva_withholding", entityId: id, before: { status: "issued" }, after: { status: "delivered", fechaEntrega } }, `tx-deliver-${id}`);
    return { ok: true as const };
  });
}

export async function listIva(ctx: Ctx) {
  return withTenant(ctx, (tx) => tx.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, ctx.companyId)).limit(200));
}

export type IvaWithholdingsReportRow = {
  certificateNumber: string;
  fechaEmision: string;
  rif: string;
  razonSocial: string;
  totalRetained: string;
  status: string;
};

/** Filas del reporte de retenciones IVA (incluye anulados, marcados en `status`). Filtra por período si se indica. */
export async function getIvaWithholdingsReport(ctx: Ctx, periodId?: string): Promise<IvaWithholdingsReportRow[]> {
  return withTenant(ctx, async (tx) => {
    const heads = await tx
      .select()
      .from(ivaWithholdings)
      .where(
        periodId
          ? and(eq(ivaWithholdings.companyId, ctx.companyId), eq(ivaWithholdings.fiscalPeriodId, periodId))
          : eq(ivaWithholdings.companyId, ctx.companyId),
      )
      .limit(500);
    const out: IvaWithholdingsReportRow[] = [];
    for (const h of heads) {
      const [p] = await tx.select().from(parties).where(eq(parties.id, h.beneficiaryId)).limit(1);
      out.push({
        certificateNumber: h.certificateNumber,
        fechaEmision: h.fechaEmision ?? "",
        rif: p?.rifOriginal ?? "",
        razonSocial: p?.razonSocial ?? "",
        totalRetained: h.totalRetained,
        status: h.status,
      });
    }
    return out.sort((a, b) => (a.fechaEmision < b.fechaEmision ? -1 : 1));
  });
}

export const IVA_WITHHOLDINGS_CSV_HEAD = "comprobante,emision,rif_beneficiario,razon_social,retenido,estado";

/** Celda CSV con comillas + neutralización de inyección (=+-@). Pura, testeable sin DB. */
export function ivaWithholdingsCell(v: string): string {
  const t = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${t.replace(/"/g, '""')}"`;
}

/** CSV del reporte (cabecera + filas). Puro, testeable sin DB. */
export function toIvaWithholdingsCsv(rows: IvaWithholdingsReportRow[]): string {
  const body = rows
    .map((r) =>
      [r.certificateNumber, r.fechaEmision, r.rif, r.razonSocial, r.totalRetained, r.status]
        .map(ivaWithholdingsCell)
        .join(","),
    )
    .join("\n");
  return `${IVA_WITHHOLDINGS_CSV_HEAD}\n${body}`;
}

/** Compras elegibles: validadas, con IVA, aún no retenidas (líneas de comprobantes no anulados). Vacío si la empresa no es agente. */
export async function listEligiblePurchases(ctx: Ctx) {
  return withTenant(ctx, async (tx) => {
    const [company] = await tx.select().from(companies).where(eq(companies.id, ctx.companyId)).limit(1);
    if (!company?.agenteRetencionIva) return [];
    const used = await tx
      .select({ purchaseDocumentId: ivaWithholdingLines.purchaseDocumentId })
      .from(ivaWithholdingLines)
      .innerJoin(ivaWithholdings, eq(ivaWithholdingLines.withholdingId, ivaWithholdings.id))
      .where(and(eq(ivaWithholdingLines.companyId, ctx.companyId), ne(ivaWithholdings.status, "voided")));
    const usedSet = new Set(used.map((u) => u.purchaseDocumentId));
    const docs = await tx.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, ctx.companyId)).limit(200);
    const out = [];
    for (const d of docs.filter((x) => x.status === "validated" && Number(x.ivaCausado) > 0 && !usedSet.has(x.id))) {
      const [p] = await tx.select().from(parties).where(eq(parties.id, d.partyId)).limit(1);
      out.push({ id: d.id, docNumber: d.docNumber, rif: p?.rifOriginal ?? "", ivaCausado: d.ivaCausado, total: d.total });
    }
    return out;
  });
}

export async function getIva(ctx: Ctx, id: string) {
  return withTenant(ctx, async (tx) => {
    const [h] = await tx.select().from(ivaWithholdings).where(eq(ivaWithholdings.id, id)).limit(1);
    if (!h || h.companyId !== ctx.companyId) return null;
    const lines = await tx.select().from(ivaWithholdingLines).where(eq(ivaWithholdingLines.withholdingId, id));
    return { header: h, lines };
  });
}
