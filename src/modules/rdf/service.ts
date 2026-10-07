import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { companyUser } from "@/db/schema";
import { fiscalDecisions, fiscalDecisionLinks } from "@/db/schema";
import { CreateDecisionSchema, UpdateDraftSchema, MotivoSchema, SignSchema } from "./schemas";
import { signedContentHash, type SignedContent } from "./canonical";

export type Ctx = { companyId: string; userId: string };

type Fail = { ok: false; error: { code: string; message: string } };
const fail = (code: string, message: string): Fail => ({ ok: false as const, error: { code, message } });

async function reserveCodigo(
  tx: Parameters<Parameters<typeof import("@/modules/tenancy/with-tenant").withTenant>[1]>[0],
  companyId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const rows = (await tx.execute(sql`
    INSERT INTO rdf_series (company_id, year, last_number)
    VALUES (${companyId}, ${year}, 1)
    ON CONFLICT (company_id, year) DO UPDATE SET last_number = rdf_series.last_number + 1
    RETURNING last_number
  `)) as unknown as { last_number: number }[];
  const n = Number(rows[0]?.last_number ?? NaN);
  if (!Number.isInteger(n) || n < 1) throw { code: "SERIES_EXHAUSTED", message: "Serie RDF no disponible." };
  return `RDF-${year}-${String(n).padStart(4, "0")}`;
}

function toSignedContent(r: typeof fiscalDecisions.$inferSelect): SignedContent {
  return {
    codigo: r.codigo,
    gap: r.gap,
    titulo: r.titulo,
    pregunta: r.pregunta,
    alternativas: (r.alternativas ?? []) as SignedContent["alternativas"],
    decision: r.decision ?? "",
    fundamento_normativo: r.fundamentoNormativo ?? "",
    formula: r.formula,
    redondeo_metodo: r.redondeoMetodo,
    redondeo_etapa: r.redondeoEtapa,
    redondeo_precision: r.redondeoPrecision,
    momento_fiscal: r.momentoFiscal,
    ejemplo_numerico: (r.ejemploNumerico ?? {}) as Record<string, string>,
    resultado_esperado: r.resultadoEsperado ?? "",
    moneda: r.moneda,
    rule_kind: r.ruleKind,
    concept_id: r.conceptId,
    vigencia_desde: r.vigenciaDesde,
    impacto_sistema: r.impactoSistema,
  };
}

export async function createDecision(ctx: Ctx, raw: z.input<typeof CreateDecisionSchema>) {
  const parsed = CreateDecisionSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);
  if (parsed.data.supersedesId) {
    const prev = await withTenant(ctx, (tx) =>
      tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.id, parsed.data.supersedesId!)).limit(1),
    );
    if (!prev[0] || prev[0].companyId !== ctx.companyId)
      return fail("NOT_FOUND", "El RDF a sustituir no existe en esta empresa.");
  }
  return withTenant(ctx, async (tx) => {
    const codigo = await reserveCodigo(tx, ctx.companyId);
    const [row] = await tx
      .insert(fiscalDecisions)
      .values({
        companyId: ctx.companyId,
        codigo,
        gap: parsed.data.gap,
        titulo: parsed.data.titulo.trim(),
        pregunta: parsed.data.pregunta.trim(),
        alternativas: parsed.data.alternativas,
        ruleKind: parsed.data.ruleKind ?? null,
        conceptId: parsed.data.conceptId ?? null,
        vigenciaDesde: parsed.data.vigenciaDesde ?? null,
        supersedesId: parsed.data.supersedesId ?? null,
        status: "draft",
        createdBy: ctx.userId,
      })
      .returning({ id: fiscalDecisions.id });
    await record(
      tx,
      { companyId: ctx.companyId, actorUserId: ctx.userId, action: "create", entityType: "fiscal_decision", entityId: row!.id, after: { codigo } },
      `tx-rdf-create-${row!.id}`,
    );
    return { ok: true as const, id: row!.id, codigo };
  });
}

export async function listDecisions(ctx: Ctx) {
  return withTenant(ctx, (tx) =>
    tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.companyId, ctx.companyId)).limit(200),
  );
}

export async function getDecision(ctx: Ctx, id: string) {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.id, id)).limit(1);
    if (!r || r.companyId !== ctx.companyId) return null;
    const links = await tx.select().from(fiscalDecisionLinks).where(eq(fiscalDecisionLinks.decisionId, id));
    return { decision: r, links };
  });
}

export async function updateDraft(ctx: Ctx, id: string, raw: z.input<typeof UpdateDraftSchema>) {
  const parsed = UpdateDraftSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.id, id)).limit(1);
    if (!r || r.companyId !== ctx.companyId) return fail("NOT_FOUND", "Decisión no existe.");
    if (!["draft", "returned"].includes(r.status)) return fail("INVALID_STATE_TRANSITION", `No se edita en estado ${r.status}.`);
    const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
    await tx
      .update(fiscalDecisions)
      .set({ ...patch, version: (r.version ?? 1) + 1, updatedAt: new Date() })
      .where(eq(fiscalDecisions.id, id));
    await record(
      tx,
      { companyId: ctx.companyId, actorUserId: ctx.userId, action: "update", entityType: "fiscal_decision", entityId: id, before: { version: r.version }, after: patch },
      `tx-rdf-update-${id}`,
    );
    return { ok: true as const };
  });
}

async function transition(ctx: Ctx, id: string, from: string[], to: string, action: string, extra: Record<string, unknown> = {}) {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.id, id)).limit(1);
    if (!r || r.companyId !== ctx.companyId) return fail("NOT_FOUND", "Decisión no existe.");
    if (!from.includes(r.status)) return fail("INVALID_STATE_TRANSITION", `No pasa de ${r.status} a ${to}.`);
    await tx.update(fiscalDecisions).set({ status: to, updatedAt: new Date(), ...extra }).where(eq(fiscalDecisions.id, id));
    await record(
      tx,
      { companyId: ctx.companyId, actorUserId: ctx.userId, action, entityType: "fiscal_decision", entityId: id, before: { status: r.status }, after: { status: to, ...extra }, reason: typeof extra.motivo === "string" ? (extra.motivo as string) : undefined },
      `tx-rdf-${action}-${id}`,
    );
    return { ok: true as const };
  });
}

export async function submitDecision(ctx: Ctx, id: string) {
  const got = await withTenant(ctx, (tx) =>
    tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.id, id)).limit(1),
  );
  const r = got[0];
  if (!r || r.companyId !== ctx.companyId) return fail("NOT_FOUND", "Decisión no existe.");
  if (!r.decision || !r.resultadoEsperado || Object.keys((r.ejemploNumerico ?? {}) as object).length === 0)
    return fail("VALIDATION_ERROR", "Complete decisión, ejemplo numérico y resultado esperado antes de enviar a revisión.");
  return transition(ctx, id, ["draft", "returned"], "in_review", "submit");
}

export async function returnDecision(ctx: Ctx, id: string, raw: z.input<typeof MotivoSchema>) {
  const parsed = MotivoSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);
  return transition(ctx, id, ["in_review", "approved"], "draft", "return", { motivo: parsed.data.motivo });
}

export async function approveDecision(ctx: Ctx, id: string) {
  const got = await withTenant(ctx, (tx) =>
    tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.id, id)).limit(1),
  );
  const r = got[0];
  if (!r || r.companyId !== ctx.companyId) return fail("NOT_FOUND", "Decisión no existe.");
  if (!r.fundamentoNormativo) return fail("VALIDATION_ERROR", "El fundamento normativo es obligatorio para aprobar.");
  return transition(ctx, id, ["in_review"], "approved", "approve");
}

export async function signDecision(ctx: Ctx, id: string, raw: z.input<typeof SignSchema>) {
  const parsed = SignSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(fiscalDecisions).where(eq(fiscalDecisions.id, id)).limit(1);
    if (!r || r.companyId !== ctx.companyId) return fail("NOT_FOUND", "Decisión no existe.");
    if (r.status !== "approved") return fail("INVALID_STATE_TRANSITION", `No pasa de ${r.status} a signed.`);
    // Cuatro-ojos (ADR-020 pendiente de matriz): si quien firma preparó el borrador y hay
    // otro contador en la empresa, exige motivo de auto-firma. Sin segundo contador, pasa.
    let fourEyesBypass = false;
    if (r.createdBy === ctx.userId) {
      const others = await tx.select({ userId: companyUser.userId }).from(companyUser).where(
        and(eq(companyUser.companyId, ctx.companyId), eq(companyUser.role, "contador")),
      );
      if (others.some((o) => o.userId !== ctx.userId)) {
        if (!parsed.data.motivo) return fail("VALIDATION_ERROR", "Cuatro-ojos: quien preparó no firma sin motivo cuando hay otro contador. Indique el motivo o pida firma a otro contador.");
        fourEyesBypass = true;
      }
    }
    const hash = signedContentHash(toSignedContent(r));
    await tx.update(fiscalDecisions).set({
      status: "signed",
      firmanteNombre: parsed.data.firmanteNombre.trim(),
      firmanteDoc: parsed.data.firmanteDoc.trim(),
      firmadoPor: ctx.userId,
      firmadoEn: new Date(),
      contentSha256: hash,
      evidenciaAdjuntoId: parsed.data.evidenciaAdjuntoId ?? null,
      motivo: parsed.data.motivo ?? r.motivo,
      updatedAt: new Date(),
    }).where(eq(fiscalDecisions.id, id));
    await record(
      tx,
      { companyId: ctx.companyId, actorUserId: ctx.userId, action: "sign", entityType: "fiscal_decision", entityId: id, before: { status: r.status }, after: { status: "signed", contentSha256: hash, fourEyesBypass }, reason: parsed.data.motivo },
      `tx-rdf-sign-${id}`,
    );
    return { ok: true as const, contentSha256: hash };
  });
}

export async function rejectDecision(ctx: Ctx, id: string, raw: z.input<typeof MotivoSchema>) {
  const parsed = MotivoSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);
  return transition(ctx, id, ["in_review", "approved"], "rejected", "reject", { motivo: parsed.data.motivo });
}

export async function supersedeDecision(ctx: Ctx, id: string, raw: z.input<typeof MotivoSchema>) {
  const parsed = MotivoSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);
  return transition(ctx, id, ["signed", "applied"], "superseded", "supersede", { motivo: parsed.data.motivo });
}
