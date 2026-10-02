import Decimal from "decimal.js";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { resolvePeriod } from "@/modules/periods/resolve";
import { record } from "@/modules/audit/record";
import { withholdingsReceived, receivedLinks, purchaseDocuments } from "@/db/schema";
import { normalizeRif } from "@/modules/fiscal-docs/service";

export type Ctx = { companyId: string; userId: string };
const MoneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

export const RegisterSchema = z.object({
  agentRif: z.string().min(3).max(20),
  agentRazon: z.string().min(2).max(200),
  certificateNumber: z.string().min(1).max(50),
  fechaComprobante: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaRecepcion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ivaCausado: MoneySchema.default("0.00"),
  montoRetenido: MoneySchema,
  purchaseDocumentIds: z.array(z.string().uuid()).max(20).default([]),
  notes: z.string().max(500).optional(),
});

/** Registra comprobante recibido con sus facturas vinculadas (estado registrada). */
export async function registerReceived(ctx: Ctx, raw: z.input<typeof RegisterSchema>) {
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  try {
    return await withTenant(ctx, async (tx) => {
      if (parsed.data.purchaseDocumentIds.length > 0) {
        for (const pid of parsed.data.purchaseDocumentIds) {
          const [d] = await tx.select().from(purchaseDocuments).where(eq(purchaseDocuments.id, pid)).limit(1);
          if (!d || d.companyId !== ctx.companyId) throw { code: "NOT_FOUND", message: "Factura vinculada no existe." };
        }
      }
      const [row] = await tx
        .insert(withholdingsReceived)
        .values({
          companyId: ctx.companyId, agentRif: normalizeRif(parsed.data.agentRif), agentRazon: parsed.data.agentRazon,
          certificateNumber: parsed.data.certificateNumber, fechaComprobante: parsed.data.fechaComprobante,
          fechaRecepcion: parsed.data.fechaRecepcion, ivaCausado: parsed.data.ivaCausado,
          montoRetenido: parsed.data.montoRetenido, notes: parsed.data.notes ?? null,
        })
        .returning({ id: withholdingsReceived.id });
      for (const pid of parsed.data.purchaseDocumentIds) {
        await tx.insert(receivedLinks).values({ companyId: ctx.companyId, receivedId: row!.id, purchaseDocumentId: pid });
      }
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "register", entityType: "withholding_received", entityId: row!.id, after: parsed.data }, `tx-recv-${row!.id}`);
      return { ok: true as const, id: row!.id };
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code: unknown }).code;
      if (code === "23505") return { ok: false as const, error: { code: "DUPLICATE_DOCUMENT", message: "Comprobante ya registrado para ese agente." } };
      if (typeof code === "string") return { ok: false as const, error: e as { code: string; message: string } };
    }
    throw e;
  }
}

/** Concilia: valida contra facturas (diferencia se acepta con motivo explícito). */
export async function conciliateReceived(ctx: Ctx, id: string, acceptDifference: boolean, reason?: string) {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(withholdingsReceived).where(eq(withholdingsReceived.id, id)).limit(1);
    if (!r || r.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "No existe." } };
    if (r.status !== "registrada") return { ok: false as const, error: { code: "INVALID_STATE_TRANSITION", message: `No conciliable desde ${r.status}.` } };
    const links = await tx.select().from(receivedLinks).where(eq(receivedLinks.receivedId, id));
    if (links.length === 0) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Vincula al menos una factura." } };
    let ivaDocs = new Decimal(0);
    for (const l of links) {
      const [d] = await tx.select().from(purchaseDocuments).where(eq(purchaseDocuments.id, l.purchaseDocumentId)).limit(1);
      if (d) ivaDocs = ivaDocs.plus(d.ivaCausado);
    }
    // Chequeo automático: lo retenido no puede exceder el IVA causado de las facturas.
    const exceso = new Decimal(r.montoRetenido).minus(ivaDocs);
    if (exceso.gt("0.01") && !acceptDifference)
      return { ok: false as const, error: { code: "VALIDATION_ERROR", message: `Retenido excede el IVA de facturas en ${exceso.toFixed(2)}; acepta con motivo.` } };
    if (exceso.gt("0.01") && (!reason || reason.trim().length < 3))
      return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Motivo requerido para aceptar exceso." } };
    await tx.update(withholdingsReceived).set({ status: "conciliada", validatedBy: ctx.userId, validatedAt: new Date(), notes: reason ?? r.notes }).where(eq(withholdingsReceived.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "conciliate", entityType: "withholding_received", entityId: id, after: { exceso: exceso.toFixed(2) }, reason }, `tx-conc-${id}`);
    return { ok: true as const };
  });
}

/** Aplica a un período explícito (el contador decide cuál). */
export async function applyReceived(ctx: Ctx, id: string, fiscalPeriodId: string) {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(withholdingsReceived).where(eq(withholdingsReceived.id, id)).limit(1);
    if (!r || r.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "No existe." } };
    if (r.status !== "conciliada") return { ok: false as const, error: { code: "INVALID_STATE_TRANSITION", message: "Concilia antes de aplicar." } };
    const periodId = fiscalPeriodId || (await resolvePeriod(tx, ctx.companyId, r.fechaRecepcion));
    await tx.update(withholdingsReceived).set({ status: "aplicada", fiscalPeriodId: periodId, appliedAt: new Date() }).where(eq(withholdingsReceived.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "apply", entityType: "withholding_received", entityId: id, after: { fiscalPeriodId: periodId } }, `tx-apply-${id}`);
    return { ok: true as const };
  });
}

export async function voidReceived(ctx: Ctx, id: string, reason: string) {
  if (reason.trim().length < 3) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Motivo requerido." } };
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(withholdingsReceived).where(eq(withholdingsReceived.id, id)).limit(1);
    if (!r || r.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "No existe." } };
    if (r.status === "anulada") return { ok: false as const, error: { code: "INVALID_STATE_TRANSITION", message: "Ya anulada." } };
    await tx.update(withholdingsReceived).set({ status: "anulada", voidReason: reason }).where(eq(withholdingsReceived.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "void", entityType: "withholding_received", entityId: id, before: { status: r.status }, after: { status: "anulada" }, reason }, `tx-void-recv-${id}`);
    return { ok: true as const };
  });
}

export async function listReceived(ctx: Ctx) {
  return withTenant(ctx, (tx) => tx.select().from(withholdingsReceived).where(eq(withholdingsReceived.companyId, ctx.companyId)).limit(200));
}

export async function getReceived(ctx: Ctx, id: string) {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(withholdingsReceived).where(eq(withholdingsReceived.id, id)).limit(1);
    if (!r || r.companyId !== ctx.companyId) return null;
    const links = await tx.select().from(receivedLinks).where(eq(receivedLinks.receivedId, id));
    const docs = [];
    for (const l of links) {
      const [d] = await tx.select().from(purchaseDocuments).where(eq(purchaseDocuments.id, l.purchaseDocumentId)).limit(1);
      if (d) docs.push(d);
    }
    return { header: r, docs };
  });
}

/** Suma aplicada en el período para el resumen (línea separada, sin neteo automático). */
export async function sumAppliedReceived(ctx: Ctx, periodId: string): Promise<string> {
  return withTenant(ctx, async (tx) => {
    const rows = await tx.select().from(withholdingsReceived).where(eq(withholdingsReceived.companyId, ctx.companyId));
    return rows
      .filter((r) => r.status === "aplicada" && r.fiscalPeriodId === periodId)
      .reduce((a, r) => a.plus(r.montoRetenido), new Decimal(0))
      .toFixed(2);
  });
}
