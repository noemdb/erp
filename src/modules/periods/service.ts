import { createHash } from "node:crypto";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { authorize } from "@/modules/tenancy/authorize";
import { record } from "@/modules/audit/record";
import { companies, fiscalPeriods, purchaseDocuments } from "@/db/schema";
import { checkCloseCore } from "./checklist";

export type Ctx = { companyId: string; userId: string };

/** Máquina de estados (DOMAIN.md). Checklist completo en F6; aquí transiciones + hash base. */
const ALLOWED: Record<string, string[]> = {
  open: ["under_review"],
  under_review: ["closed", "open"],
  closed: ["reopened"],
  reopened: ["under_review", "closed"],
};

const ReasonSchema = z.string().min(3).max(500);

async function transition(
  ctx: Ctx,
  periodId: string,
  to: string,
  patch: Record<string, unknown>,
  auditAction: string,
  reason?: string,
) {
  return withTenant(ctx, async (tx: DrizzleTx) => {
    const [p] = await tx.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, periodId)).limit(1);
    if (!p || p.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Período no existe." } };
    if (!ALLOWED[p.status]?.includes(to))
      return { ok: false as const, error: { code: "INVALID_STATE_TRANSITION", message: `No se puede pasar de ${p.status} a ${to}.` } };

    let closureHash = p.closureHash;
    if (to === "closed") {
      const check = await checkCloseCore(tx, ctx.companyId, periodId);
      const blocking = check.items.filter((i) => i.bloqueante && !i.ok);
      if (blocking.length > 0)
        return { ok: false as const, error: { code: "CHECKLIST_BLOCKED", message: `Cierre bloqueado: ${blocking.map((b) => b.detalle).join("; ")}.` } };
      const docs = await tx
        .select({ id: purchaseDocuments.id })
        .from(purchaseDocuments)
        .where(eq(purchaseDocuments.fiscalPeriodId, periodId));
      closureHash = createHash("sha256").update(docs.map((d) => d.id).sort().join(",")).digest("hex");
    }
    await tx.update(fiscalPeriods).set({ status: to, ...patch, closureHash, updatedAt: new Date() }).where(eq(fiscalPeriods.id, periodId));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: auditAction, entityType: "fiscal_period", entityId: periodId, before: { status: p.status }, after: { status: to }, reason }, `tx-period-${periodId}-${to}`);
    return { ok: true as const };
  });
}

export const sendToReview = (ctx: Ctx, id: string) => transition(ctx, id, "under_review", {}, "send_review");
export const returnToOpen = (ctx: Ctx, id: string, reason: string) => {
  const r = ReasonSchema.safeParse(reason);
  if (!r.success) return Promise.resolve({ ok: false as const, error: { code: "VALIDATION_ERROR", message: "Motivo requerido." } });
  return transition(ctx, id, "open", { reopenReason: r.data }, "return_open", r.data);
};
export const closePeriod = (ctx: Ctx, id: string) =>
  transition(ctx, id, "closed", { closedBy: ctx.userId, closedAt: new Date() }, "close");
export const reopenPeriod = (ctx: Ctx, id: string, reason: string) => {
  const r = ReasonSchema.safeParse(reason);
  if (!r.success) return Promise.resolve({ ok: false as const, error: { code: "VALIDATION_ERROR", message: "Motivo de reapertura requerido." } });
  return transition(ctx, id, "reopened", { reopenReason: r.data, reopenedBy: ctx.userId, reopenedAt: new Date() }, "reopen", r.data);
};

export async function listPeriods(ctx: Ctx) {
  return withTenant(ctx, (tx: DrizzleTx) =>
    tx.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, ctx.companyId)).limit(100),
  );
}

export const CreatePeriodSchema = z.object({
  kind: z.enum(["monthly", "biweekly"]),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  /** Solo quincenal: Q1 = días 1–15, Q2 = día 16 en adelante. */
  half: z.enum(["Q1", "Q2"]).optional(),
}).refine((v) => v.kind === "monthly" || v.half !== undefined, {
  message: "Indica la quincena (Q1/Q2).",
  path: ["half"],
});

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Rango Postgres para el período solicitado. Mensual o quincenal. */
export function rangeForPeriod(input: z.output<typeof CreatePeriodSchema>): { kind: string; range: string } {
  const { kind, year, month, half } = input;
  const mm = pad2(month);
  if (kind === "monthly") {
    const nextMonth = month === 12 ? `01` : pad2(month + 1);
    const nextYear = month === 12 ? year + 1 : year;
    return { kind, range: `[${year}-${mm}-01,${nextYear}-${nextMonth}-01)` };
  }
  const nextMonth = month === 12 ? `01` : pad2(month + 1);
  const nextYear = month === 12 ? year + 1 : year;
  if (half === "Q1") return { kind, range: `[${year}-${mm}-01,${year}-${mm}-16)` };
  return { kind, range: `[${year}-${mm}-16,${nextYear}-${nextMonth}-01)` };
}

export type CreatePeriodResult =
  | { ok: true; id: string; created: boolean }
  | { ok: false; error: { code: string; message: string } };

/** Registro manual de un período fiscal (idempotente por empresa+tipo+rango). Solo contador. */
export async function createPeriod(ctx: Ctx, input: z.input<typeof CreatePeriodSchema>): Promise<CreatePeriodResult> {
  const parsed = CreatePeriodSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Período inválido: revisa año, mes y quincena." } };
  const auth = await authorize(ctx.companyId, ctx.userId, "periods.close");
  if (!auth.ok)
    return { ok: false, error: { code: "FORBIDDEN", message: "Solo el contador puede registrar períodos." } };
  const { kind, range } = rangeForPeriod(parsed.data);
  return withTenant(ctx, async (tx: DrizzleTx) => {
    const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, ctx.companyId)).limit(1);
    if (!company)
      return { ok: false as const, error: { code: "NOT_FOUND", message: "Empresa no existe." } };
    const existing = await tx
      .select()
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.companyId, ctx.companyId), eq(fiscalPeriods.kind, kind), eq(fiscalPeriods.range, range)))
      .limit(1);
    if (existing[0]) return { ok: true as const, id: existing[0].id, created: false };
    await tx.execute(sql`
      INSERT INTO fiscal_periods (company_id, kind, range, status)
      VALUES (${ctx.companyId}, ${kind}, ${range}, 'open')
      ON CONFLICT (company_id, kind, range) DO NOTHING
    `);
    const rows = await tx
      .select()
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.companyId, ctx.companyId), eq(fiscalPeriods.kind, kind), eq(fiscalPeriods.range, range)))
      .limit(1);
    const found = rows[0];
    if (!found)
      return { ok: false as const, error: { code: "PERIOD_CLOSED", message: "No se pudo registrar el período (reintenta)." } };
    await record(
      tx,
      {
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        action: "create",
        entityType: "fiscal_period",
        entityId: found.id,
        before: null,
        after: { kind, range, status: found.status },
      },
      `tx-period-${found.id}-create`,
    );
    return { ok: true as const, id: found.id, created: true };
  });
}
