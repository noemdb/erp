import { eq } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { documentSeries, ivaWithholdings, islrWithholdings } from "@/db/schema";
import { maxEmitted, certSeq } from "./emission-ledger";

export type Ctx = { companyId: string; userId: string };
export type SeriesCheck = {
  kind: string;
  periodKey: string;
  dbSeries: number;
  dbEmittedMax: number;
  ledgerMax: number;
  status: "OK" | "GAP_LEDGER" | "GAP_DB";
};

/**
 * 2.0.5 §5.3: compara serie DB vs. máximo emitido en DB vs. registro externo.
 * - GAP_DB (ledger > DB): tras un restore se perdieron emisiones → resembrar
 *   la serie al máximo del ledger ANTES de reabrir la emisión.
 * - GAP_LEDGER (DB > ledger): el ledger no registró (fallo best-effort) → revisar.
 * Solo lectura; no muta nada.
 */
export async function reconcileSeries(ctx: Ctx): Promise<SeriesCheck[]> {
  return withTenant(ctx, async (tx) => {
    const series = await tx.select().from(documentSeries).where(eq(documentSeries.companyId, ctx.companyId));
    const out: SeriesCheck[] = [];
    for (const s of series) {
      const kind = s.kind as "iva_withholding" | "islr_withholding";
      const table = kind === "iva_withholding" ? ivaWithholdings : islrWithholdings;
      const rows = await tx.select({ certificateNumber: table.certificateNumber }).from(table).where(eq(table.companyId, ctx.companyId));
      const inPeriod = rows.map((r) => r.certificateNumber).filter((c) => c.includes(s.periodKey));
      const dbEmittedMax = inPeriod.reduce((a, c) => Math.max(a, certSeq(c)), 0);
      const ledgerMax = maxEmitted(ctx.companyId, kind, s.periodKey);
      const dbSeries = Number(s.lastNumber);
      const status = ledgerMax > Math.max(dbSeries, dbEmittedMax) ? "GAP_DB" : dbEmittedMax > ledgerMax ? "GAP_LEDGER" : "OK";
      out.push({ kind, periodKey: s.periodKey, dbSeries, dbEmittedMax, ledgerMax, status });
    }
    return out.sort((a, b) => a.periodKey.localeCompare(b.periodKey));
  });
}
