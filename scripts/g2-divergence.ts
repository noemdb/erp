/** S0/G2 (2.0.1 WS4): divergencias payment_only vs account_credit_or_payment por evento. Solo lectura. Uso: npx tsx scripts/g2-divergence.ts <RIF> */
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { companies, settlementEvents, settlementAllocations, islrWithholdings, purchaseDocuments } from "../src/db/schema";

const _RIF = process.argv[2];
if (!_RIF) {
  console.error("uso: g2-divergence.ts <RIF>");
  process.exit(1);
}
const RIF: string = _RIF;

async function main() {
  const [c] = await db.select().from(companies).where(eq(companies.rif, RIF.toUpperCase())).limit(1);
  if (!c) throw new Error("empresa no existe");
  const events = await db.select().from(settlementEvents).where(eq(settlementEvents.companyId, c.id));
  const allW = await db.select().from(islrWithholdings).where(eq(islrWithholdings.companyId, c.id));
  console.log("| evento | tipo | fecha | monto | asignado-a | retención emitida |");
  console.log("|---|---|---|---|---|---|");
  let divergen = 0;
  for (const e of events) {
    const allocs = await db.select().from(settlementAllocations).where(eq(settlementAllocations.eventId, e.id));
    const docs: string[] = [];
    for (const a of allocs) {
      const [d] = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.id, a.purchaseDocumentId)).limit(1);
      if (d) docs.push(`${d.docNumber}(${a.amountAllocated})`);
    }
    const w = allW.find((x) => x.settlementEventId === e.id && x.status !== "voided");
    // Divergencia potencial: abono asignado sin retención (bloqueado en unset) o pago sin retención.
    const div = !w && docs.length > 0 ? "DIVERGE" : "—";
    if (div !== "—") divergen++;
    console.log(`| ${e.id.slice(0, 8)} | ${e.eventType} | ${e.eventDate} | ${e.amount} | ${docs.join("; ") || "—"} | ${w ? w.certificateNumber : "—"} | ${div} |`);
  }
  console.log(`\nEventos: ${events.length} · divergencias potenciales: ${divergen} (criterio actual: ${(c as { abonoCriterion?: string }).abonoCriterion ?? "?"})`);
  process.exit(0);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
