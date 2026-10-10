/**
 * B40: gate de vulnerabilidades (grupo 3). Compara `npm audit --json` contra
 * `audit-baseline.json` (las 17 preexistentes 2026-10-10) y falla si aparece
 * una vulnerabilidad NUEVA de severidad critical/high.
 * Uso: npm run audit:check [-- --audit-file <json>] [--update]
 * `--audit-file` permite verificación offline y en tests; `--update` reescribe la
 * baseline (solo con orden explícita: cada upgrade mayor se revisa aparte).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(dirname(fileURLToPath(import.meta.url)), "audit-baseline.json");
const GATING = new Set(["critical", "high"]);

export function loadBaseline() {
  return JSON.parse(readFileSync(BASELINE, "utf8"));
}

/** Extrae { nombre: severidad } del formato `npm audit --json`. */
export function advisoryMap(audit) {
  const out = {};
  for (const [name, info] of Object.entries(audit?.vulnerabilities ?? {})) {
    out[name] = info?.severity ?? "unknown";
  }
  return out;
}

/**
 * Compara auditoría viva contra baseline.
 * Falla (ok=false) solo ante critical/high NUEVAS (no registradas).
 * Las moderate/low nuevas se reportan sin fallar; las resueltas se listan.
 */
export function checkAudit(audit, baseline) {
  const live = advisoryMap(audit);
  const fresh = [];
  const freshLow = [];
  const resolved = [];
  for (const [name, sev] of Object.entries(live)) {
    if (!(name in baseline)) (GATING.has(sev) ? fresh : freshLow).push(`${name} (${sev})`);
    else if (baseline[name] !== sev) fresh.push(`${name} (${baseline[name]}→${sev})`);
  }
  for (const name of Object.keys(baseline)) {
    if (!(name in live)) resolved.push(name);
  }
  return { ok: fresh.length === 0, total: Object.keys(live).length, fresh, freshLow, resolved };
}

function readAudit(file) {
  if (file) return JSON.parse(readFileSync(file, "utf8"));
  try {
    return JSON.parse(execSync("npm audit --json", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  } catch (e) {
    // npm audit sale != 0 cuando hay vulnerabilidades: el stdout trae el JSON igual.
    const out = e?.stdout ?? "";
    if (!out) throw new Error(`npm audit sin salida: ${e?.message ?? e}`);
    return JSON.parse(out);
  }
}

const args = process.argv.slice(2);
const fileIx = args.indexOf("--audit-file");
if (import.meta.url === `file://${process.argv[1]}`) {
  const baseline = loadBaseline();
  const audit = readAudit(fileIx >= 0 ? args[fileIx + 1] : null);
  if (args.includes("--update")) {
    writeFileSync(BASELINE, JSON.stringify(advisoryMap(audit), null, 2) + "\n");
    console.log(`baseline actualizada: ${Object.keys(advisoryMap(audit)).length} advisories`);
    process.exit(0);
  }
  const r = checkAudit(audit, baseline);
  console.log(`audit: ${r.total} advisories (${r.fresh.length} critical/high nuevas, ${r.freshLow.length} mod/low nuevas, ${r.resolved.length} resueltas)`);
  for (const f of r.fresh) console.log(`NUEVA: ${f}`);
  for (const f of r.freshLow) console.log(`aviso: ${f}`);
  for (const f of r.resolved) console.log(`resuelta: ${f}`);
  process.exit(r.ok ? 0 : 1);
}
