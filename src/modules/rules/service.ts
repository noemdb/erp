import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { withholdingRules, withholdingConcepts } from "@/db/schema";

export type Ctx = { companyId: string; userId: string };

/**
 * Fiscal Change Control (1.0.2): borrador → revisión → aprobación → activación.
 * Activar cierra la vigencia anterior (trunca rango + superseded), nunca UPDATE
 * de parámetros históricos. Solo contador (matriz de usuarios pendiente, ADR-020).
 */
export const DraftSchema = z.object({
  ruleKind: z.enum(["iva", "islr"]),
  conceptId: z.string().uuid().nullable().optional(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  porcentaje: z.string().regex(/^\d+(\.\d{1,6})?$/),
  sustraendo: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
  baseFormulaKind: z.string().min(1).max(50),
  legalReference: z.string().min(3).max(500),
  changeReason: z.string().min(3).max(500),
  synthetic: z.boolean().default(false),
});

function lowerOf(range: string): string {
  return /^\[(.*?),(.*?)\)$/.exec(range)?.[1] ?? "";
}

function overlaps(aFrom: string, aTo: string | null, bFrom: string, bTo: string | null): boolean {
  return aFrom < (bTo ?? "9999") && (aTo ?? "9999") > bFrom;
}

export async function createDraft(ctx: Ctx, raw: z.input<typeof DraftSchema>) {
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  if (parsed.data.ruleKind === "iva" && parsed.data.conceptId)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "IVA no lleva concepto." } };
  if (parsed.data.ruleKind === "islr" && !parsed.data.conceptId)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "ISLR requiere concepto." } };
  return withTenant(ctx, async (tx) => {
    const [row] = await tx
      .insert(withholdingRules)
      .values({
        companyScopeKey: ctx.companyId, ruleKind: parsed.data.ruleKind, conceptId: parsed.data.conceptId ?? null,
        effectiveRange: `[${parsed.data.effectiveFrom},)`, porcentaje: parsed.data.porcentaje,
        sustraendo: parsed.data.sustraendo, baseFormulaKind: parsed.data.baseFormulaKind,
        legalReference: parsed.data.legalReference, status: "draft", changeReason: parsed.data.changeReason,
        synthetic: parsed.data.synthetic,
      })
      .returning({ id: withholdingRules.id });
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "draft", entityType: "withholding_rule", entityId: row!.id, after: parsed.data }, `tx-rule-${row!.id}`);
    return { ok: true as const, id: row!.id };
  });
}

async function transition(ctx: Ctx, id: string, from: string[], to: string, action: string, extra: Record<string, unknown> = {}) {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(withholdingRules).where(eq(withholdingRules.id, id)).limit(1);
    if (!r || r.companyScopeKey !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Regla no existe." } };
    if (!from.includes(r.status)) return { ok: false as const, error: { code: "INVALID_STATE_TRANSITION", message: `No pasa de ${r.status} a ${to}.` } };
    // Guardia de producción (2.0.2 ítem 1): lo sintético no se activa en producción.
    if (to === "active" && r.synthetic && process.env.NODE_ENV === "production")
      return { ok: false as const, error: { code: "FORBIDDEN", message: "Regla sintética: no activable en producción." } };

    if (to === "active") {
      // Cierra versiones activas solapadas: trunca vigencia + marca superseded.
      const fromDate = lowerOf(r.effectiveRange);
      const actives = await tx.select().from(withholdingRules).where(
        and(eq(withholdingRules.companyScopeKey, ctx.companyId), eq(withholdingRules.ruleKind, r.ruleKind), eq(withholdingRules.status, "active")),
      );
      for (const a of actives) {
        if (a.id === id) continue;
        if ((a.conceptId ?? null) !== (r.conceptId ?? null)) continue;
        const m = /^\[(.*?),(.*?)\)$/.exec(a.effectiveRange);
        if (!m) continue;
        const aTo = m[2] === "" ? null : m[2]!;
        if (!overlaps(m[1]!, aTo, fromDate, null)) continue;
        if (fromDate <= m[1]!) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: `La nueva vigencia debe empezar después de ${m[1]}.` } };
        await tx.update(withholdingRules).set({ effectiveRange: `[${m[1]},${fromDate})`, status: "superseded" }).where(eq(withholdingRules.id, a.id));
        await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "supersede", entityType: "withholding_rule", entityId: a.id, before: { effectiveRange: a.effectiveRange, status: "active" }, after: { effectiveRange: `[${m[1]},${fromDate})`, status: "superseded" } }, `tx-rule-sup-${a.id}`);
      }
    }

    await tx.update(withholdingRules).set({
      status: to,
      ...(to === "approved" ? { approvedBy: ctx.userId, approvedAt: new Date() } : {}),
      ...extra,
    }).where(eq(withholdingRules.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action, entityType: "withholding_rule", entityId: id, before: { status: r.status }, after: { status: to, ...extra } }, `tx-rule-${action}-${id}`);
    return { ok: true as const };
  });
}

export const submitRule = (ctx: Ctx, id: string) => transition(ctx, id, ["draft"], "in_review", "submit");
export const approveRule = (ctx: Ctx, id: string) => transition(ctx, id, ["in_review"], "approved", "approve");
export const activateRule = (ctx: Ctx, id: string) => transition(ctx, id, ["approved"], "active", "activate");

export async function listRules(ctx: Ctx) {
  return withTenant(ctx, (tx) =>
    tx.select().from(withholdingRules).where(eq(withholdingRules.companyScopeKey, ctx.companyId)).limit(200),
  );
}

export async function getRule(ctx: Ctx, id: string) {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(withholdingRules).where(eq(withholdingRules.id, id)).limit(1);
    if (!r || r.companyScopeKey !== ctx.companyId) return null;
    let concept = null;
    if (r.conceptId) [concept] = await tx.select().from(withholdingConcepts).where(eq(withholdingConcepts.id, r.conceptId)).limit(1);
    return { rule: r, concept: concept ?? null };
  });
}

export async function createConcept(ctx: Ctx, raw: { codigo: string; nombre: string }) {
  const codigo = raw.codigo.trim().toUpperCase(), nombre = raw.nombre.trim();
  if (!codigo || !nombre) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Código y nombre requeridos." } };
  return withTenant(ctx, async (tx) => {
    const dup = await tx.select().from(withholdingConcepts).where(eq(withholdingConcepts.codigo, codigo)).limit(1);
    if (dup.some((d) => d.companyId === null || d.companyId === ctx.companyId))
      return { ok: false as const, error: { code: "DUPLICATE_DOCUMENT", message: "Código ya existe." } };
    const [row] = await tx.insert(withholdingConcepts).values({ companyId: ctx.companyId, codigo, nombre, baseFormulaKind: "monto_pagado" }).returning({ id: withholdingConcepts.id });
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "create", entityType: "withholding_concept", entityId: row!.id, after: { codigo, nombre } }, `tx-concept-${row!.id}`);
    return { ok: true as const, id: row!.id };
  });
}
