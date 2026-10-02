/** Compara xlsx golden vs ERP y emite bitácora D1–D5.
 * Uso: npx tsx scripts/golden-compare.ts --golden <xlsx> --actual <xlsx> --decisions <json> [--md-out <ruta>] [--csv-out <ruta>]
 * Sin --md-out/--csv-out imprime a stdout. NO guardar salidas con datos reales en el repo.
 * Exit 1 si queda alguna fila ABIERTA (bloquea CI/M2). */
import { readFileSync, writeFileSync } from "node:fs";
import {
  compareWorkbooks,
  buildBitacora,
  formatBitacora,
  bitacoraCsv,
  parseDecisions,
} from "../src/modules/reporting/excel-compare";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const goldenPath = arg("--golden");
  const actualPath = arg("--actual");
  const decisionsPath = arg("--decisions");
  if (!goldenPath || !actualPath || !decisionsPath) {
    console.error("uso: golden-compare.ts --golden <xlsx> --actual <xlsx> --decisions <json> [--md-out <ruta>] [--csv-out <ruta>]");
    process.exit(1);
  }
  const { decisions, errors } = parseDecisions(JSON.parse(readFileSync(decisionsPath, "utf8")));
  if (errors.length > 0) {
    console.error(`decisiones inválidas: ${errors.join("; ")}`);
    process.exit(1);
  }
  const { diffs } = await compareWorkbooks(readFileSync(goldenPath), readFileSync(actualPath));
  const rows = buildBitacora(diffs, decisions);
  const open = rows.filter((r) => r.estado === "ABIERTA");
  const md = `# Bitácora de diferencias (generada)\n\n> D1 abiertas deben ser 0 al cierre. No versionar salidas con datos reales.\n\n${formatBitacora(rows)}\n`;
  const mdOut = arg("--md-out");
  const csvOut = arg("--csv-out");
  if (mdOut) writeFileSync(mdOut, md);
  else console.log(md);
  if (csvOut) writeFileSync(csvOut, bitacoraCsv(rows));
  console.log(`\nfilas: ${rows.length} · abiertas: ${open.length} · aprobadas: ${rows.length - open.length}`);
  process.exit(open.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
