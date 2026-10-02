/** S0: valida contrato de fixtures dorados (2.0.1 WS2). Uso: npm run goldens:check. Falla con candidatos sin firma dentro de fixtures/. */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "tax-scenarios");
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(JSON.parse(readFileSync(join(dir, "schema.json"), "utf8")));
const manifest = JSON.parse(readFileSync(join(dir, "_manifest.json"), "utf8"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "schema.json");

let errors = 0;
for (const f of files) {
  const s = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (!validate(s)) {
    errors++;
    console.log(`ESQUEMA ${f}:`, ajv.errorsText(validate.errors));
  }
  if (JSON.stringify(s).includes("PROPUESTO_NO_VALIDADO")) {
    errors++;
    console.log(`ESTADO ${f}: candidato sin firma dentro de fixtures/`);
  }
}
const listed = [...(manifest.casos ?? [])].sort();
if (JSON.stringify([...files].sort()) !== JSON.stringify(listed)) {
  errors++;
  console.log(`MANIFEST: archivos=${files} manifest=${listed}`);
}
console.log(errors === 0 ? `goldens ok (${files.length} fixtures)` : `goldens: ${errors} problemas`);
process.exit(errors === 0 ? 0 : 1);
