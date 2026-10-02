import { eq, and, desc } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { auditEvents, purchaseDocuments } from "@/db/schema";

export type Ctx = { companyId: string; userId: string };

/** Bitácora filtrable (auditor: solo lectura). Límite 500 por página v1. */
export async function listAuditEvents(ctx: Ctx, filter?: { entityType?: string; entityId?: string }) {
  return withTenant(ctx, async (tx) => {
    const conds = [eq(auditEvents.companyId, ctx.companyId)];
    if (filter?.entityType) conds.push(eq(auditEvents.entityType, filter.entityType));
    if (filter?.entityId) conds.push(eq(auditEvents.entityId, filter.entityId));
    return tx.select().from(auditEvents).where(and(...conds)).orderBy(desc(auditEvents.occurredAt)).limit(500);
  });
}

/** Línea de tiempo por documento: evento creación + origen archivo/fila si importado. */
export async function documentTimeline(ctx: Ctx, docId: string) {
  return withTenant(ctx, async (tx) => {
    const [doc] = await tx.select().from(purchaseDocuments).where(eq(purchaseDocuments.id, docId)).limit(1);
    if (!doc || doc.companyId !== ctx.companyId) return null;
    const events = await tx
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.companyId, ctx.companyId), eq(auditEvents.entityType, "purchase_document"), eq(auditEvents.entityId, docId)))
      .orderBy(desc(auditEvents.occurredAt));
    return {
      doc: { id: doc.id, docNumber: doc.docNumber, status: doc.status, fiscalPeriodId: doc.fiscalPeriodId },
      origin: doc.importBatchId ? { batchId: doc.importBatchId, fileId: doc.sourceFileId, row: doc.sourceRowNumber } : null,
      events,
    };
  });
}
