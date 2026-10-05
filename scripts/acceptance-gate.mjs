/** ACC-01: gate de aceptación por perfil (ci/release/golive) con denominadores visibles.
 * El reporte nunca promedia lo fácil: cada línea muestra firmados ÷ requeridos.
 * Uso: npm run acceptance:gate -- --profile=ci|release|golive (defecto ci).
 * Requiere acceptance/test-results/summary.json (npm run acceptance:evidence).
 * Sale 0 = GO, 1 = NO-GO (con el faltante exacto, no un rojo genérico).
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const profile = (process.argv.find((a) => a.startsWith("--profile="))?.split("=")[1] ?? "ci").trim();
if (!["ci", "release", "golive"].includes(profile)) {
  console.error("perfil: ci | release | golive");
  process.exit(1);
}

const line = (ok, nombre, num, den, nota = "") =>
  `  [${ok ? "OK " : "FALTA"}] ${nombre}: ${num}/${den}${nota ? ` — ${nota}` : ""}`;
const out = [];
let go = true;
const check = (ok, nombre, num, den, nota = "") => {
  out.push(line(ok, nombre, num, den, nota));
  if (!ok) go = false;
};

// ---- TÉCNICO (summary.json de acceptance:evidence) ----
out.push("TÉCNICO");
const sumPath = join(root, "acceptance/test-results/summary.json");
if (!existsSync(sumPath)) {
  check(false, "evidencia de suite", 0, 1, "sin summary.json: corre npm run acceptance:evidence");
} else {
  const s = JSON.parse(readFileSync(sumPath, "utf8"));
  check(s.testsFallidos === 0, "tests", s.testsPasados, s.testsPasados + s.testsFallidos, s.fecha);
  check(s.archivosOk === s.archivos, "archivos de test", s.archivosOk, s.archivos);
  const skipped = (s.detalle ?? []).reduce((a, f) => a + (f.skipped ?? 0), 0);
  out.push(`  (info) omitidos: ${skipped} (se reportan, no se esconden)`);
}

// ---- FISCAL (goldens:check + firmas + matriz) ----
out.push("FISCAL");
let gold = { fixtures: 0, firmados: 0, errores: -1 };
try {
  const raw = execSync("node scripts/validate-goldens.mjs --json", { cwd: root, encoding: "utf8" });
  const last = raw.trim().split("\n").pop();
  gold = JSON.parse(last);
} catch { /* errores: retiene -1 = gate caído */ }
check(gold.errores === 0, "contrato golden + firmas válidas", gold.errores === 0 ? 1 : 0, 1);
const manifest = JSON.parse(readFileSync(join(root, "fixtures/tax-scenarios/_manifest.json"), "utf8"));
const umbral = manifest.umbralGolive ?? 30;
if (profile === "release" || profile === "golive") {
  const min = profile === "golive" ? umbral : 1;
  check(gold.firmados >= min, "dorados firmados", gold.firmados, min);
}
if (profile === "golive") {
  const firmada = manifest.matrizVersion !== "borrador-no-firmada";
  check(firmada, "matriz v1 firmada", firmada ? 1 : 0, 1, `manifest: ${manifest.matrizVersion}`);
  const m2dir = join(root, "acceptance/period-reconciliation");
  const m2 = existsSync(m2dir) ? readdirSync(m2dir).length : 0;
  check(m2 > 0, "M2/M5 período real conciliado", m2 > 0 ? 1 : 0, 1, "acceptance/period-reconciliation/");
  const acta = existsSync(join(root, "docs/acta-aceptacion-firmada.md"));
  check(acta, "acta de aceptación firmada", acta ? 1 : 0, 1);
}

// ---- OPERATIVO ----
out.push("OPERATIVO");
if (profile === "golive") {
  const drill = existsSync(join(root, "acceptance/test-results/restore-drill.json"));
  check(drill, "restore drill con RPO/RTO", drill ? 1 : 0, 1);
  out.push("  (info) ORR, UAT y capacitación se verifican por firma humana, no por script");
} else {
  out.push("  (info) este perfil no exige evidencia operativa");
}

console.log(`acceptance:gate --profile=${profile}\n${out.join("\n")}\n${go ? "GO" : "NO-GO"}`);
process.exit(go ? 0 : 1);
