import { eq, and } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import {
  importBatches, purchaseDocuments, salesDocuments,
  ivaWithholdings, islrWithholdings, generatedReports,
} from "@/db/schema";

export type Ctx = { companyId: string; userId: string };
export type CheckItem = { key: string; ok: boolean; detalle: string; bloqueante: boolean };

/** Núcleo reutilizable dentro de una TX (el cierre lo ejecuta antes de congelar). */
export async function checkCloseCore(tx: DrizzleTx, companyId: string, periodId: string): Promise<{ ready: boolean; items: CheckItem[] }> {
  const items: CheckItem[] = [];

  const pending = await tx.select().from(importBatches).where(eq(importBatches.companyId, companyId));
  const stuck = pending.filter((b) => ["uploaded", "mapping", "validating"].includes(b.status));
  items.push({ key: "lotes", bloqueante: true, ok: stuck.length === 0, detalle: stuck.length === 0 ? "Sin lotes pendientes" : `${stuck.length} lote(s) sin validar/confirmar` });

  const buys = await tx.select().from(purchaseDocuments).where(and(eq(purchaseDocuments.companyId, companyId), eq(purchaseDocuments.fiscalPeriodId, periodId)));
  const sells = await tx.select().from(salesDocuments).where(and(eq(salesDocuments.companyId, companyId), eq(salesDocuments.fiscalPeriodId, periodId)));
  const orphans = [...buys.filter((d) => (d.kind === "credit_note" || d.kind === "debit_note") && !d.affectedDocumentId),
    ...sells.filter((d) => (d.kind === "credit_note" || d.kind === "debit_note") && !d.affectedDocumentId)];
  items.push({ key: "nc-afectado", bloqueante: true, ok: orphans.length === 0, detalle: orphans.length === 0 ? "NC/ND con afectado" : `${orphans.length} NC/ND sin afectado` });

  const ivaP = await tx.select().from(ivaWithholdings).where(and(eq(ivaWithholdings.companyId, companyId), eq(ivaWithholdings.fiscalPeriodId, periodId)));
  const islrP = await tx.select().from(islrWithholdings).where(and(eq(islrWithholdings.companyId, companyId), eq(islrWithholdings.fiscalPeriodId, periodId)));
  const hanging = [...ivaP, ...islrP].filter((w) => !["issued", "delivered", "voided"].includes(w.status));
  items.push({ key: "retenciones", bloqueante: true, ok: hanging.length === 0, detalle: hanging.length === 0 ? "Retenciones emitidas/anuladas" : `${hanging.length} retención(es) sin emitir` });

  const reps = await tx.select().from(generatedReports).where(and(eq(generatedReports.companyId, companyId), eq(generatedReports.fiscalPeriodId, periodId)));
  items.push({ key: "reportes", bloqueante: false, ok: reps.length > 0, detalle: reps.length > 0 ? `${reps.length} versión(es) congelada(s)` : "Sin versiones congeladas (recomendado)" });
  items.push({ key: "documentos", bloqueante: false, ok: buys.length + sells.length > 0, detalle: `${buys.length} compra(s), ${sells.length} venta(s)` });

  return { ready: items.every((i) => i.ok), items };
}

/** Checklist automatizado de cierre (completo en app; triggers lo respaldan en DB). */
export async function getCloseChecklist(ctx: Ctx, periodId: string): Promise<{ ready: boolean; items: CheckItem[] }> {
  return withTenant(ctx, (tx) => checkCloseCore(tx, ctx.companyId, periodId));
}
