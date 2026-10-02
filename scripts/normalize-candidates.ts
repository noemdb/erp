/** S0: normaliza dorados-propuestos → pendientes/SEGUNDA_REV/dorados-normalizados/ (no fixtures). Uso: npx tsx scripts/normalize-candidates.ts */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCandidate } from "../src/lib/normalize-candidates";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.parse(readFileSync(join(root, "pendientes/PRIMERA_REV/dorados-propuestos-F0.json"), "utf8")) as { escenarios: Record<string, unknown>[] };
const out = join(root, "pendientes/SEGUNDA_REV/dorados-normalizados");
mkdirSync(out, { recursive: true });
let flagged = 0;
for (const e of src.escenarios) {
  const n = normalizeCandidate(e);
  if (n.advertencias.length > 0) flagged++;
  writeFileSync(join(out, `${n.id}.json`), JSON.stringify(n, null, 2));
}
console.log(`${src.escenarios.length} candidatos → ${out} (${flagged} con advertencias)`);
