/** Inventario estructural de un xlsx candidato a golden SIN exponer valores (sin PII en salida).
 * Uso: npx tsx scripts/golden-inspect.ts --file <xlsx> [--json-out <ruta>]
 * No escribe nada dentro del repo por defecto; no redirigir salidas con datos reales a archivos versionados. */
import { writeFileSync } from "node:fs";
import { inspectGolden } from "../src/modules/reporting/excel-compare";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("--file");
  if (!file) {
    console.error("uso: golden-inspect.ts --file <xlsx> [--json-out <ruta>]");
    process.exit(1);
  }
  const inv = await inspectGolden(file);
  const out = JSON.stringify(inv, null, 2);
  const jsonOut = arg("--json-out");
  if (jsonOut) writeFileSync(jsonOut, out);
  else console.log(out);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
