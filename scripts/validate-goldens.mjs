/** S0: valida contrato de fixtures dorados (2.0.1 WS2). Uso: npm run goldens:check [-- --json]. Falla con candidatos sin firma dentro de fixtures/. ACC-02: un fixture con estado VALIDADO_CONTADOR exige firma.sha256_contenido igual al sha256 del contenido canónico (JSON con claves ordenadas, sin el bloque `firma`). */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import Ajv from "ajv";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "tax-scenarios");
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(JSON.parse(readFileSync(join(dir, "schema.json"), "utf8")));
const manifest = JSON.parse(readFileSync(join(dir, "_manifest.json"), "utf8"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "schema.json");

/** JSON canónico: claves ordenadas recursivamente (firma ligada al contenido). */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** Verifica la firma de un fixture. Solo VALIDADO_CONTADOR cuenta como firmado. */
export function verifyFirma(s) {
  if (s.estado !== "VALIDADO_CONTADOR") return { firmado: false };
  const { firma, ...sinFirma } = s;
  const hash = createHash("sha256").update(canonical(sinFirma)).digest("hex");
  if (firma?.sha256_contenido !== hash)
    return { firmado: false, error: `sha256_contenido no coincide con el contenido (esperado ${hash})` };
  return { firmado: true };
}

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
    const v = verifyFirma(s);
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
