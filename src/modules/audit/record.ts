import { randomUUID } from "node:crypto";
import type { DrizzleTx } from "@/modules/tenancy/with-tenant";
import { auditEvents } from "@/db/schema";

export type AuditInput = {
  companyId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};

/** Escribe el evento en la misma TX que el cambio (ADR-011). txId agrupa eventos de una TX. */
export async function record(tx: DrizzleTx, input: AuditInput, txId: string = randomUUID()): Promise<void> {
  await tx.insert(auditEvents).values({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: (input.before ?? null) as never,
    after: (input.after ?? null) as never,
    reason: input.reason ?? null,
    txId,
  });
}
