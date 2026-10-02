/** 4.6: paquete de evidencia. Uso: npm run acceptance:report (rellena versiones y estructura; las suites se adjuntan desde CI). */
import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(root, "fixtures/tax-scenarios/_manifest.json"), "utf8"));
const migrations = existsSync(join(root, "drizzle/migrations/meta/_journal.json"))
  ? JSON.parse(readFileSync(join(root, "drizzle/migrations/meta/_journal.json"), "utf8")).entries.length
  : 0;
const suites = readdirSync(join(root, "src"), { recursive: true }).filter((f) => String(f).endsWith(".test.ts"));

const md = `# Acceptance report — ERP TributarioLite

- Fecha: ${new Date().toISOString()}
- App: ${pkg.name} ${pkg.version} (Node ${process.version})
- Matriz fiscal: ${manifest.matrizVersion}
- Fixtures golden: ${(manifest.casos ?? []).join(", ")}
- Migraciones aplicadas (journal): ${migrations}
- Suites técnicas: ${suites.length} archivos (*.test.ts)
- Base de datos: Neon dev PG16 (ver .env)

## Resultados por suite (adjuntar salida de CI)

| Suite | Resultado | Evidencia |
|---|---|---|
| golden (fixtures) | pendiente firma contador | test-results/golden-results.json |
| properties (fast-check) | ver CI | test-results/property-tests.json |
| multitenant/fuga | ver CI | — |
| concurrencia 50 | ver CI | — |
| e2e servicios | ver CI | — |
| período real M2/M5 | BLOQUEADO: sin muestras | period-reconciliation/ |

## Gates 4.7 (requieren contador/cliente)

dorados firmados 100% · fugas 0 · emisiones 50–100 sin duplicados/huecos · E2E 100% · período conciliado 100% · diferencias no aprobadas 0 · evidencia reproducible 100%.
`;

mkdirSync(join(root, "acceptance"), { recursive: true });
writeFileSync(join(root, "acceptance/acceptance-report.md"), md);
console.log("acceptance/acceptance-report.md generado");
