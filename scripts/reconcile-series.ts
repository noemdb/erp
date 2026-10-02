/** 2.0.5 §5.3: reconcile serie DB vs ledger externo (solo lectura). Uso: npx tsx scripts/reconcile-series.ts <companyId> */
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { companies } from "../src/db/schema";
import { reconcileSeries } from "../src/modules/withholdings/reconcile";

const _companyId = process.argv[2];
if (!_companyId) {
  console.error("uso: reconcile-series.ts <companyId>");
  process.exit(1);
}
const companyId: string = _companyId;

async function main() {
  const [c] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!c) throw new Error("empresa no existe");
  // Contexto de sistema explícito para lectura operativa (ver CONVENTIONS.md).
  const rows = await reconcileSeries({ companyId, userId: "system:reconcile" });
  console.log("| tipo | período | serie DB | máx DB | máx ledger | estado |");
  console.log("|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.kind} | ${r.periodKey} | ${r.dbSeries} | ${r.dbEmittedMax} | ${r.ledgerMax} | ${r.status} |`);
  const gaps = rows.filter((r) => r.status !== "OK");
  if (gaps.length > 0) {
    console.log("\nGAP_DB = resembrar serie al máximo del ledger ANTES de emitir (ver runbook restore). GAP_LEDGER = revisar escritura del ledger.");
    process.exit(2);
  }
  console.log("\nOK: sin huecos entre serie, DB y ledger.");
  process.exit(0);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
