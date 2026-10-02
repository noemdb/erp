/** 2.0.2 ítem 1: deriva entre reglas activas y workflow (toda activa debe tener trail approve→activate; sintéticas en prod = alerta). Uso: npx tsx scripts/check-drift.ts */
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { withholdingRules, auditEvents } from "../src/db/schema";

async function main() {
  const actives = await db.select().from(withholdingRules).where(eq(withholdingRules.status, "active"));
  let alerts = 0;
  for (const r of actives) {
    const trail = await db.select().from(auditEvents).where(eq(auditEvents.entityId, r.id));
    const kinds = new Set(trail.map((t) => t.action));
    const problems: string[] = [];
    if (!kinds.has("approve") || !kinds.has("activate")) problems.push("sin trail approve/activate (¿cargada fuera del workflow?)");
    if (!r.legalReference) problems.push("sin fuente normativa");
    if (r.synthetic && process.env.NODE_ENV === "production") problems.push("SINTÉTICA ACTIVA EN PRODUCCIÓN");
    if (problems.length > 0) {
      alerts++;
      console.log(`- ${r.ruleKind} ${r.id} [${r.effectiveRange}]: ${problems.join("; ")}`);
    }
  }
  console.log(`${actives.length} activas, ${alerts} alertas`);
  process.exit(alerts > 0 ? 2 : 0);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
