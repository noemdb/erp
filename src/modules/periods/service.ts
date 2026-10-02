import { createHash } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { fiscalPeriods, purchaseDocuments } from "@/db/schema";
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
