import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { z } from "zod";
import { eq, and, ne, lte, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { appendEmission } from "./emission-ledger";
import { resolvePeriod } from "@/modules/periods/resolve";
import { computeIslrWithholding } from "@/modules/tax-engine/compute";
import { record } from "@/modules/audit/record";
import {
  companies, settlementEvents, settlementAllocations, parties, withholdingConcepts, withholdingRules,
  islrWithholdings, islrWithholdingLines,
} from "@/db/schema";
import type { AbonoCriterion } from "@/db/schema/tenancy";
import { GLOBAL_SCOPE } from "./constants";
import { reserveNumber, formatCertificate, periodKeyFor } from "./series";

export type Ctx = { companyId: string; userId: string };

export const IssueIslrSchema = z.object({
  settlementEventId: z.string().uuid(),
  conceptId: z.string().uuid(),
  baseSujeta: z.string().regex(/^\d+(\.\d{1,2})?$/),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function contains(range: string, date: string): boolean {
  const m = /^\[(.*?),(.*?)\)$/.exec(range);
  return !!m && (m[1] === "" || date >= m[1]!) && (m[2] === "" || date < m[2]!);
}

async function resolveIslrRule(tx: DrizzleTx, companyId: string, conceptId: string, asOf: string) {
  const rows = await tx
    .select()
    .from(withholdingRules)
    .where(and(eq(withholdingRules.ruleKind, "islr"), eq(withholdingRules.status, "active")));
  const live = rows.filter((r) => contains(r.effectiveRange, asOf) && (r.conceptId === null || r.conceptId === conceptId));
  return live.find((r) => r.companyScopeKey === companyId) ?? live.find((r) => r.companyScopeKey === GLOBAL_SCOPE) ?? null;
}

type SettlementEvent = typeof settlementEvents.$inferSelect;
type Allocation = typeof settlementAllocations.$inferSelect;

type Candidate = {
  eligible: boolean;
  eventId?: string;
  eventType?: "payment" | "account_credit";
  fechaRetencion?: string;
  periodo?: string;
  eventAmount?: string;
  currency?: string;
  baseSujeta?: string;
  ruleVersionId?: string;
  porcentaje?: string;
  sustraendo?: string;
  condicionesRegla?: unknown;
  retainedAmount?: string;
  explanation?: string[];
  reason?: string;
  isInputEvent?: boolean;
};

async function findEvent(tx: DrizzleTx, ctx: Ctx, eventId: string): Promise<SettlementEvent> {
  const [event] = await tx.select().from(settlementEvents).where(eq(settlementEvents.id, eventId)).limit(1);
  if (!event || event.companyId !== ctx.companyId || event.status !== "active")
    throw { code: "NOT_FOUND", message: "Evento de liquidación no existe." };
  return event;
}

async function getAllocations(tx: DrizzleTx, eventId: string): Promise<Allocation[]> {
  return tx.select().from(settlementAllocations).where(eq(settlementAllocations.eventId, eventId));
}

function allocationSignature(rows: Allocation[]): string {
  return rows
    .map((row) => `${row.purchaseDocumentId}:${row.amountAllocated}`)
    .sort()
    .join("|");
}

async function earliestAccountCreditCandidate(
  tx: DrizzleTx,
  ctx: Ctx,
  inputEvent: SettlementEvent,
): Promise<{ event: SettlementEvent; allocations: Allocation[]; isInputEvent: boolean } | { reason: string }> {
  const ownAllocations = await getAllocations(tx, inputEvent.id);
  if (ownAllocations.length === 0) return { reason: "Asigne el evento a una compra antes de evaluar el disparador alternativo." };
  const documentIds = new Set(ownAllocations.map((row) => row.purchaseDocumentId));
  const competingType = inputEvent.eventType === "payment" ? "account_credit" : "payment";
  const competitors = await tx
    .select()
    .from(settlementEvents)
    .where(
      and(
        eq(settlementEvents.companyId, ctx.companyId),
        eq(settlementEvents.partyId, inputEvent.partyId),
        eq(settlementEvents.eventType, competingType),
        eq(settlementEvents.status, "active"),
        lte(settlementEvents.eventDate, inputEvent.eventDate),
      ),
    );
  if (competitors.length === 0) return { event: inputEvent, allocations: ownAllocations, isInputEvent: true };

  const allocations = await tx
    .select()
    .from(settlementAllocations)
    .where(inArray(settlementAllocations.eventId, competitors.map((row) => row.id)));
  const byEvent = new Map<string, Allocation[]>();
  for (const allocation of allocations) {
    byEvent.set(allocation.eventId, [...(byEvent.get(allocation.eventId) ?? []), allocation]);
  }
  const unallocated = competitors.find((row) => (byEvent.get(row.id) ?? []).length === 0);
  if (unallocated) {
    return { reason: "Hay un evento anterior sin asignación verificable; el disparador alternativo es incierto." };
  }
  const overlapping = competitors
    .filter((row) => (byEvent.get(row.id) ?? []).some((allocation) => documentIds.has(allocation.purchaseDocumentId)))
    .sort((left, right) => left.eventDate.localeCompare(right.eventDate) || left.id.localeCompare(right.id));
  const first = overlapping[0];
  if (!first) return { event: inputEvent, allocations: ownAllocations, isInputEvent: true };
  if (first.eventDate < inputEvent.eventDate || first.id !== inputEvent.id) {
    return { event: first, allocations: byEvent.get(first.id) ?? [], isInputEvent: false };
  }
  return { event: inputEvent, allocations: ownAllocations, isInputEvent: true };
}

async function calculateCandidate(
  tx: DrizzleTx,
  ctx: Ctx,
  input: z.infer<typeof IssueIslrSchema>,
  event: SettlementEvent,
  periodKind: "monthly" | "biweekly",
  isInputEvent: boolean,
): Promise<{ preview: Candidate; event: SettlementEvent; allocations: Allocation[]; calc: ReturnType<typeof computeIslrWithholding>; rule: typeof withholdingRules.$inferSelect; concept: typeof withholdingConcepts.$inferSelect; party: typeof parties.$inferSelect }> {
  if (new Decimal(input.baseSujeta).gt(event.amount)) {
    throw { code: "VALIDATION_ERROR", message: "La base sujeta no puede exceder el importe del evento." };
  }
  const allocations = await getAllocations(tx, event.id);
  if (allocations.length === 0) {
    throw { code: "G2_EVENT_REVIEW_REQUIRED", message: "Asigne el evento a una compra antes de previsualizar o emitir." };
  }
  const [concept] = await tx.select().from(withholdingConcepts).where(eq(withholdingConcepts.id, input.conceptId)).limit(1);
  if (!concept) throw { code: "NOT_FOUND", message: "Concepto no existe." };
  const dup = await tx
    .select({ id: islrWithholdingLines.id })
    .from(islrWithholdingLines)
    .innerJoin(islrWithholdings, eq(islrWithholdingLines.withholdingId, islrWithholdings.id))
    .where(and(eq(islrWithholdingLines.companyId, ctx.companyId), eq(islrWithholdings.settlementEventId, event.id), eq(islrWithholdings.conceptId, input.conceptId), ne(islrWithholdings.status, "voided")))
    .limit(1);
  if (dup.length > 0) throw { code: "VALIDATION_ERROR", message: "Este evento ya tiene retención para ese concepto." };
  const rule = await resolveIslrRule(tx, ctx.companyId, input.conceptId, event.eventDate);
  if (!rule) throw { code: "NOT_APPLICABLE", message: "Sin regla ISLR vigente para concepto/fecha." };
  const calc = computeIslrWithholding({
    baseSujeta: input.baseSujeta,
    rule: { ruleVersionId: rule.id, ruleSnapshot: { porcentaje: rule.porcentaje, sustraendo: rule.sustraendo }, porcentaje: rule.porcentaje, sustraendo: rule.sustraendo },
  });
  const [party] = await tx.select().from(parties).where(eq(parties.id, event.partyId)).limit(1);
  const preview: Candidate = {
    eligible: true,
    eventId: event.id,
    eventType: event.eventType,
    fechaRetencion: event.eventDate,
    periodo: periodKeyFor(event.eventDate, periodKind),
    eventAmount: event.amount,
    currency: event.currency,
    baseSujeta: input.baseSujeta,
    ruleVersionId: rule.id,
    porcentaje: rule.porcentaje,
    sustraendo: rule.sustraendo,
    condicionesRegla: rule.conditions,
    retainedAmount: calc.retainedAmount,
    explanation: calc.explanation,
    isInputEvent,
  };
  return { preview, event, allocations, calc, rule, concept, party: party! };
}

type PreviewDecision = {
  criterion: AbonoCriterion;
  paymentOnly: Candidate;
  accountCreditOrPayment: Candidate;
  converged: boolean;
  canIssue: boolean;
  blockReason: string | null;
  selected: Awaited<ReturnType<typeof calculateCandidate>> | null;
};

async function buildPreviewDecision(
  tx: DrizzleTx,
  ctx: Ctx,
  input: z.infer<typeof IssueIslrSchema>,
  lockForIssue = false,
): Promise<PreviewDecision> {
  if (lockForIssue) await tx.execute(sql`SELECT id FROM companies WHERE id = ${ctx.companyId} FOR UPDATE`);
  const [company] = await tx
    .select({ abonoCriterion: companies.abonoCriterion, periodKind: companies.periodKind })
    .from(companies)
    .where(eq(companies.id, ctx.companyId))
    .limit(1);
  if (!company) throw { code: "NOT_FOUND", message: "Empresa no existe." };
  const inputEvent = await findEvent(tx, ctx, input.settlementEventId);
  if (lockForIssue) await tx.execute(sql`SELECT id FROM parties WHERE id = ${inputEvent.partyId} FOR UPDATE`);
  if (company.periodKind !== "monthly" && company.periodKind !== "biweekly") {
    throw { code: "VALIDATION_ERROR", message: "period_kind de empresa no reconocido." };
  }
  const periodKind = company.periodKind;
  let paymentCalculation: Awaited<ReturnType<typeof calculateCandidate>> | null = null;
  let paymentOnly: Candidate = { eligible: false, reason: "El criterio payment_only no reconoce un evento account_credit." };
  if (inputEvent.eventType === "payment") {
    try {
      paymentCalculation = await calculateCandidate(tx, ctx, input, inputEvent, periodKind, true);
      paymentOnly = paymentCalculation.preview;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const domainError = error as { message?: string };
        paymentOnly = { eligible: false, reason: domainError.message ?? "No se pudo calcular el criterio payment_only." };
      } else {
        throw error;
      }
    }
  }

  let alternative: Candidate;
  let alternativeCalculation: Awaited<ReturnType<typeof calculateCandidate>> | null = null;
  const alternativeEvent = await earliestAccountCreditCandidate(tx, ctx, inputEvent);
  if ("reason" in alternativeEvent) {
    alternative = { eligible: false, reason: alternativeEvent.reason };
  } else if (
    paymentCalculation &&
    alternativeEvent.isInputEvent &&
    alternativeEvent.event.id === inputEvent.id
  ) {
    alternativeCalculation = paymentCalculation;
    alternative = paymentCalculation.preview;
  } else {
    try {
      alternativeCalculation = await calculateCandidate(
        tx, ctx, input, alternativeEvent.event, periodKind, alternativeEvent.isInputEvent,
      );
      alternative = alternativeCalculation.preview;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const domainError = error as { message?: string };
        alternative = { eligible: false, reason: domainError.message ?? "No se pudo calcular el criterio alternativo." };
      } else {
        throw error;
      }
    }
  }

  if (paymentCalculation) paymentOnly.eligible = true;
  const converged =
    paymentCalculation !== null &&
    alternativeCalculation !== null &&
    alternative.eligible &&
    alternativeCalculation.event.eventDate === paymentCalculation.event.eventDate &&
    alternativeCalculation.preview.periodo === paymentCalculation.preview.periodo &&
    alternativeCalculation.rule.id === paymentCalculation.rule.id &&
    alternativeCalculation.preview.baseSujeta === paymentCalculation.preview.baseSujeta &&
    alternativeCalculation.calc.retainedAmount === paymentCalculation.calc.retainedAmount &&
    alternativeCalculation.event.amount === paymentCalculation.event.amount &&
    alternativeCalculation.event.currency === paymentCalculation.event.currency &&
    allocationSignature(alternativeCalculation.allocations) === allocationSignature(paymentCalculation.allocations);

  let selected: Awaited<ReturnType<typeof calculateCandidate>> | null = null;
  if (company.abonoCriterion === "payment_only" && paymentCalculation) selected = paymentCalculation;
  if (
    company.abonoCriterion === "account_credit_or_payment" &&
    alternativeCalculation?.preview.isInputEvent
  ) selected = alternativeCalculation;
  if (company.abonoCriterion === "unset" && converged && paymentCalculation) selected = paymentCalculation;

  const supportedIssuePeriod = periodKind === "monthly";
  const canIssue = selected !== null && supportedIssuePeriod;
  const blockReason = canIssue
    ? null
    : !supportedIssuePeriod
      ? "La emisión ISLR con período quincenal no está implementada; no se reservará número."
    : company.abonoCriterion === "unset"
      ? "El criterio está sin configurar. Solo se permite emitir un pago cuando ambos criterios convergen en fecha, período, regla, base e importe."
      : company.abonoCriterion === "payment_only"
        ? "El criterio configurado solo permite emitir eventos payment."
        : "El evento no es el primer evento verificable bajo account_credit_or_payment, o carece de asignación.";
  return {
    criterion: company.abonoCriterion,
    paymentOnly,
    accountCreditOrPayment: alternative,
    converged,
    canIssue,
    blockReason,
    selected,
  };
}

export async function previewIslr(ctx: Ctx, raw: z.input<typeof IssueIslrSchema>) {
  const parsed = IssueIslrSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message },
    };
  }
  try {
    return await withTenant(ctx, async (tx) => {
      const decision = await buildPreviewDecision(tx, ctx, parsed.data);
      const selected = decision.selected;
      return {
        ok: true as const,
        criterion: decision.criterion,
        paymentOnly: decision.paymentOnly,
        accountCreditOrPayment: decision.accountCreditOrPayment,
        converged: decision.converged,
        canIssue: decision.canIssue,
        blockReason: decision.blockReason,
        retainedAmount: selected?.calc.retainedAmount ?? null,
        ruleVersionId: selected?.rule.id ?? null,
        explanation: selected?.calc.explanation ?? [],
      };
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      return { ok: false as const, error: error as { code: string; message: string } };
    }
    throw error;
  }
}

export async function issueIslr(ctx: Ctx, raw: z.input<typeof IssueIslrSchema>, opts?: { replacesId?: string }) {
  const parsed = IssueIslrSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  try {
    const res = await withTenant(ctx, async (tx) => {
      // Serializa emisiones sobre el mismo evento+concepto (chequeo de duplicado + inserción).
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`islr-ev:${parsed.data.settlementEventId}:${parsed.data.conceptId}`}))`);
      if (opts?.replacesId) {
        const [old] = await tx.select().from(islrWithholdings).where(eq(islrWithholdings.id, opts.replacesId)).limit(1);
        if (!old || old.companyId !== ctx.companyId) throw { code: "NOT_FOUND", message: "Comprobante a sustituir no existe." };
        if (old.status !== "voided") throw { code: "INVALID_STATE_TRANSITION", message: "Solo se sustituye un comprobante anulado." };
      }
      const decision = await buildPreviewDecision(tx, ctx, parsed.data, true);
      if (!decision.canIssue || !decision.selected) {
        throw {
          code: "G2_EVENT_REVIEW_REQUIRED",
          message: decision.blockReason ?? "Los criterios de retención no convergen; requiere decisión del contador.",
        };
      }
      const { event, concept, rule, calc, party } = decision.selected;
      const periodId = await resolvePeriod(tx, ctx.companyId, event.eventDate);
      const periodKey = periodKeyFor(parsed.data.fechaEmision);
      const n = await reserveNumber(tx, ctx.companyId, "islr_withholding", periodKey);
      const cert = formatCertificate("islr_withholding", periodKey, n); // provisional hasta G9
      const snapshot = {
        certificateNumber: cert, fechaEmision: parsed.data.fechaEmision, fechaRetencion: event.eventDate, eventType: event.eventType,
        abonoCriterion: decision.criterion,
        g2Comparison: {
          converged: decision.converged,
          paymentOnly: decision.paymentOnly,
          accountCreditOrPayment: decision.accountCreditOrPayment,
        },
        beneficiary: { rif: party.rifOriginal, razon: party.razonSocial },
        concept: { id: concept.id, codigo: concept.codigo, nombre: concept.nombre },
        baseSujeta: parsed.data.baseSujeta, eventAmount: event.amount, porcentaje: rule.porcentaje, sustraendo: rule.sustraendo,
        retainedAmount: calc.retainedAmount, explanation: calc.explanation,
      };
      const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
      const [h] = await tx
        .insert(islrWithholdings)
        .values({
          companyId: ctx.companyId, beneficiaryId: event.partyId, fiscalPeriodId: periodId,
          conceptId: concept.id, settlementEventId: event.id, certificateNumber: cert, status: "issued",
          fechaEmision: parsed.data.fechaEmision, ruleVersionId: rule.id,
          ruleSnapshot: { porcentaje: rule.porcentaje, sustraendo: rule.sustraendo },
          totalRetained: calc.retainedAmount, issuedBy: ctx.userId, issuedAt: new Date(), dataSnapshot: { ...snapshot, hash },
          replacesId: opts?.replacesId ?? null,
        })
        .returning({ id: islrWithholdings.id });
      await tx.insert(islrWithholdingLines).values({
        companyId: ctx.companyId, withholdingId: h!.id, baseSujeta: parsed.data.baseSujeta,
        porcentaje: rule.porcentaje, sustraendo: rule.sustraendo,
        retainedAmount: calc.retainedAmount, explanation: calc.explanation,
      });
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "issue", entityType: "islr_withholding", entityId: h!.id, after: { cert } }, `tx-issue-islr-${h!.id}`);
      return { ok: true as const, id: h!.id, certificateNumber: cert, total: calc.retainedAmount, sha256: hash };
    });
    if (res.ok) {
      // Registro externo post-commit best-effort (ver issueIva).
      try {
        appendEmission({ companyId: ctx.companyId, kind: "islr_withholding", certificateNumber: res.certificateNumber, fechaEmision: parsed.data.fechaEmision, sha256: res.sha256 });
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

export async function voidIslr(ctx: Ctx, id: string, reason: string) {
  if (reason.trim().length < 3) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Motivo requerido." } };
  return withTenant(ctx, async (tx) => {
    const [w] = await tx.select().from(islrWithholdings).where(eq(islrWithholdings.id, id)).limit(1);
    if (!w || w.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Comprobante no existe." } };
    if (w.status !== "issued" && w.status !== "delivered")
      return { ok: false as const, error: { code: "INVALID_STATE_TRANSITION", message: `No anulable desde ${w.status}.` } };
    await tx.update(islrWithholdings).set({ status: "voided", voidedAt: new Date(), voidReason: reason }).where(eq(islrWithholdings.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "void", entityType: "islr_withholding", entityId: id, before: { status: w.status }, after: { status: "voided" }, reason }, `tx-void-islr-${id}`);
    return { ok: true as const };
  });
}

export async function listIslr(ctx: Ctx) {
  return withTenant(ctx, (tx) => tx.select().from(islrWithholdings).where(eq(islrWithholdings.companyId, ctx.companyId)).limit(200));
}

export async function listConcepts(ctx: Ctx) {
  return withTenant(ctx, async (tx) => {
    const all = await tx.select().from(withholdingConcepts).where(eq(withholdingConcepts.status, "active")).limit(100);
    return all.filter((c) => c.companyId === null || c.companyId === ctx.companyId);
  });
}

export async function getIslr(ctx: Ctx, id: string) {
  return withTenant(ctx, async (tx) => {
    const [h] = await tx.select().from(islrWithholdings).where(eq(islrWithholdings.id, id)).limit(1);
    if (!h || h.companyId !== ctx.companyId) return null;
    const lines = await tx.select().from(islrWithholdingLines).where(eq(islrWithholdingLines.withholdingId, id));
    return { header: h, lines };
  });
}
