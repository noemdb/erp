/** S0: valida contrato de fixtures dorados (2.0.1 WS2). Uso: npm run goldens:check [-- --json]. Falla con candidatos sin firma dentro de fixtures/. ACC-02: un fixture con estado VALIDADO_CONTADOR exige firma.sha256_contenido igual al sha256 del contenido canónico (JSON con claves ordenadas, sin el bloque `firma`). */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { verifyGolden } from "../src/modules/goldens/verify.ts";

/** Canon único del proyecto (Fase 0.2, cierra D9): mismo canon que `rdf` y `activation-gate`. */
export { canonical } from "../src/modules/shared/canonical.ts";
export { verifyGolden as verifyFirma };

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "tax-scenarios");
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(JSON.parse(readFileSync(join(dir, "schema.json"), "utf8")));
const manifest = JSON.parse(readFileSync(join(dir, "_manifest.json"), "utf8"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "schema.json");

let errors = 0;
let firmados = 0;
function runCli() {
for (const f of files) {
  const raw = readFileSync(join(dir, f), "utf8");
  const s = JSON.parse(raw);
  if (!validate(s)) {
    errors++;
    console.log(`ESQUEMA ${f}:`, ajv.errorsText(validate.errors));
    continue;
  }
  if (JSON.stringify(s).includes("PROPUESTO_NO_VALIDADO")) {
    errors++;
    console.log(`ESTADO ${f}: candidato sin firma dentro de fixtures/`);
    continue;
  }
  if (s.estado === "VALIDADO_CONTADOR") {
    const v = verifyGolden(s);
    if (!v.firmado) {
      errors++;
      console.log(`FIRMA ${f}: ${v.error}`);
    } else firmados++;
  }
}
const listed = [...(manifest.casos ?? [])].sort();
if (JSON.stringify([...files].sort()) !== JSON.stringify(listed)) {
  errors++;
  console.log(`MANIFEST: archivos=${files} manifest=${listed}`);
}
console.log(errors === 0 ? `goldens ok (${files.length} fixtures, ${firmados} firmados)` : `goldens: ${errors} problemas`);
if (process.argv.includes("--json"))
  console.log(JSON.stringify({ fixtures: files.length, firmados, errores: errors }));
process.exit(errors === 0 ? 0 : 1);
}
if (process.argv[1]?.endsWith("validate-goldens.mjs")) runCli();
