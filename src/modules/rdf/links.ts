import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { fiscalDecisions, fiscalDecisionLinks } from "@/db/schema";
import { withholdingRules } from "@/db/schema";
import { LinkSchema, MotivoSchema } from "./schemas";
import type { Ctx } from "./service";

const fail = (code: string, message: string) => ({ ok: false as const, error: { code, message } });

/** Vincula un RDF a una regla (rol autoriza/aclara/deroga). La regla no debe estar activa. */
export async function linkDecisionToRule(ctx: Ctx, decisionId: string, raw: z.input<typeof LinkSchema>) {
  const parsed = LinkSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);
  return withTenant(ctx, async (tx) => {
    const [d] = await tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.id, decisionId)).limit(1);
    if (!d || d.companyId !== ctx.companyId) return fail("NOT_FOUND", "Decisión no existe.");
    const [r] = await tx.select().from(withholdingRules).where(eq(withholdingRules.id, parsed.data.ruleId)).limit(1);
    if (!r || r.companyScopeKey !== ctx.companyId) return fail("NOT_FOUND", "Regla no existe en esta empresa.");
    if (r.status === "active") return fail("INVALID_STATE_TRANSITION", "La regla ya está activa: el vínculo debió crearse antes de activar.");
    const [row] = await tx.insert(fiscalDecisionLinks).values({
      companyId: ctx.companyId, decisionId, ruleId: parsed.data.ruleId, rol: parsed.data.rol,
      nota: parsed.data.nota ?? null, createdBy: ctx.userId,
    }).returning({ id: fiscalDecisionLinks.id }).catch(() => [null] as const);
    if (!row) return fail("DUPLICATE_DOCUMENT", "Ese vínculo ya existe.");
    await record(
      tx,
      { companyId: ctx.companyId, actorUserId: ctx.userId, action: "link", entityType: "fiscal_decision_link", entityId: row.id, after: { decisionId, ruleId: parsed.data.ruleId, rol: parsed.data.rol } },
      `tx-rdf-link-${row.id}`,
    );
    return { ok: true as const, id: row.id };
  });
}

export async function unlinkDecisionFromRule(ctx: Ctx, linkId: string, raw: z.input<typeof MotivoSchema>) {
  const parsed = MotivoSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);
  return withTenant(ctx, async (tx) => {
    const [l] = await tx.select().from(fiscalDecisionLinks).where(eq(fiscalDecisionLinks.id, linkId)).limit(1);
    if (!l || l.companyId !== ctx.companyId) return fail("NOT_FOUND", "Vínculo no existe.");
    const [r] = await tx.select().from(withholdingRules).where(eq(withholdingRules.id, l.ruleId)).limit(1);
    if (r && r.status === "active") return fail("INVALID_STATE_TRANSITION", "La regla ya está activa: no se puede desvincular su autorización.");
    await tx.delete(fiscalDecisionLinks).where(eq(fiscalDecisionLinks.id, linkId));
    await record(
      tx,
      { companyId: ctx.companyId, actorUserId: ctx.userId, action: "unlink", entityType: "fiscal_decision_link", entityId: linkId, before: { decisionId: l.decisionId, ruleId: l.ruleId }, reason: parsed.data.motivo },
      `tx-rdf-unlink-${linkId}`,
    );
    return { ok: true as const };
  });
}

/**
 * Cobertura RDF para activar (I-RDF-3): existe link `autoriza` a una decisión
 * firmada/aplicada de la misma empresa, mismo rule_kind y mismo concepto
 * (ambos nulos para IVA, iguales para ISLR).
 */
export async function hasRdfCoverage(
  tx: DrizzleTx,
  args: { companyId: string; ruleKind: string; conceptId: string | null },
): Promise<boolean> {
  const rows = await tx
    .select({ status: fiscalDecisions.status, ruleKind: fiscalDecisions.ruleKind, conceptId: fiscalDecisions.conceptId })
    .from(fiscalDecisionLinks)
    .innerJoin(fiscalDecisions, eq(fiscalDecisionLinks.decisionId, fiscalDecisions.id))
    .where(
      and(
        eq(fiscalDecisionLinks.companyId, args.companyId),
        eq(fiscalDecisionLinks.rol, "autoriza"),
      ),
    );
  return rows.some(
    (x) =>
      (x.status === "signed" || x.status === "applied") &&
      x.ruleKind === args.ruleKind &&
      (x.conceptId ?? null) === (args.conceptId ?? null),
  );
}

/** Marca decisiones firmadas vinculadas como aplicadas (misma TX que activa la regla). */
export async function markLinkedApplied(tx: DrizzleTx, ctx: Ctx, ruleId: string): Promise<void> {
  const rows = await tx
    .select({ decisionId: fiscalDecisionLinks.decisionId })
    .from(fiscalDecisionLinks)
    .innerJoin(fiscalDecisions, eq(fiscalDecisionLinks.decisionId, fiscalDecisions.id))
    .where(and(eq(fiscalDecisionLinks.companyId, ctx.companyId), eq(fiscalDecisionLinks.ruleId, ruleId), eq(fiscalDecisionLinks.rol, "autoriza"), eq(fiscalDecisions.status, "signed")));
  for (const l of rows) {
    await tx.update(fiscalDecisions).set({ status: "applied", updatedAt: new Date() }).where(eq(fiscalDecisions.id, l.decisionId));
    await record(
      tx,
      { companyId: ctx.companyId, actorUserId: ctx.userId, action: "apply", entityType: "fiscal_decision", entityId: l.decisionId, before: { status: "signed" }, after: { status: "applied", ruleId } },
      `tx-rdf-apply-${l.decisionId}`,
    );
  }
}
