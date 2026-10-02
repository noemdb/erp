/** 4.6: corre la suite con reporter JSON y genera acceptance/test-results + actualiza el report. Uso: npm run acceptance:evidence */
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "acceptance/test-results");
mkdirSync(outDir, { recursive: true });

const rawPath = join(outDir, "vitest.json");
try {
  execSync(`npx vitest run --reporter=json --outputFile=${rawPath}`, { cwd: root, stdio: "inherit", env: process.env });
} catch {
  console.log("vitest terminó con fallos (se registran igual)");
}
if (!existsSync(rawPath)) {
  console.error("sin resultados");
  process.exit(1);
}
const raw = JSON.parse(readFileSync(rawPath, "utf8"));
const files = raw.testResults ?? [];
const byFile = files.map((f) => ({
  archivo: f.name.replace(root + "/", ""),
  ok: f.status === "passed",
  passed: (f.assertionResults ?? []).filter((a) => a.status === "passed").length,
  failed: (f.assertionResults ?? []).filter((a) => a.status === "failed").length,
}));
const passed = byFile.reduce((a, f) => a + f.passed, 0);
const failed = byFile.reduce((a, f) => a + f.failed, 0);
const isGolden = (n) => n.includes("engine") || n.includes("guarantees") || n.includes("workflow");
const isProp = (n) => n.includes("properties");
const summary = {
  fecha: new Date().toISOString(),
  archivos: byFile.length,
  archivosOk: byFile.filter((f) => f.ok).length,
  testsPasados: passed,
  testsFallidos: failed,
  golden: byFile.filter((f) => isGolden(f.archivo)),
  propiedades: byFile.filter((f) => isProp(f.archivo)),
  detalle: byFile,
};
writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
writeFileSync(join(outDir, "golden-results.json"), JSON.stringify({ fecha: summary.fecha, archivos: summary.golden }, null, 2));
writeFileSync(join(outDir, "property-tests.json"), JSON.stringify({ fecha: summary.fecha, archivos: summary.propiedades }, null, 2));

const reportPath = join(root, "acceptance/acceptance-report.md");
let report = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "# Acceptance report\n";
report += `\n## Corrida ${summary.fecha}\n\n- Archivos: ${summary.archivosOk}/${summary.archivos} ok · Tests: ${summary.testsPasados} pasados, ${summary.testsFallidos} fallidos\n- Golden: ${summary.golden.filter((f) => f.ok).length}/${summary.golden.length} ok · Propiedades: ${summary.propiedades.filter((f) => f.ok).length}/${summary.propiedades.length} ok\n`;
writeFileSync(reportPath, report);
console.log(`evidencia: ${summary.archivosOk}/${summary.archivos} archivos, ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
