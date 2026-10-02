/** S0/G8: corre las 12 combinaciones contra un CSV (doc,base,rate,legacy_iva) e imprime la tabla. Uso: npx tsx scripts/calibrate-rounding.ts archivo.csv */
import { readFileSync } from "node:fs";
import { calibrate, type CalibDoc } from "../src/modules/tax-engine/calibrate";

const [, , file] = process.argv;
if (!file) {
  console.error("uso: calibrate-rounding.ts archivo.csv  # columnas: doc,base,rate,legacy_iva");
  process.exit(1);
}
const lines = readFileSync(file, "utf8").replace(/^\uFEFF/, "").split("\n").map((l) => l.trim()).filter(Boolean);
const byDoc = new Map<string, CalibDoc>();
for (const line of lines.slice(1)) {
  const [doc = "", base = "", rate = "", legacy = ""] = line.split(/[;,]/).map((x) => x.trim());
  if (!doc) continue;
  const d = byDoc.get(doc) ?? { id: doc, lines: [], legacyTotalIva: legacy };
  d.lines.push({ base, rate });
  if (legacy) d.legacyTotalIva = legacy;
  byDoc.set(doc, d);
}
const table = calibrate([...byDoc.values()]);
console.log("| combinación | docs con dif | suma dif |");
console.log("|---|---|---|");
for (const r of table) console.log(`| ${r.combo} | ${r.docsConDiff} | ${r.sumaDiff} |`);
const cero = table.filter((r) => r.docsConDiff === 0);
console.log(cero.length > 0 ? `\nCombinaciones con 0 diferencias: ${cero.map((r) => r.combo).join(", ")}` : "\nNinguna combinación da 0 diferencias: el legacy no es referencia directa.");
