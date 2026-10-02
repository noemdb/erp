/** S0 (2.0.1 WS1.5/WS5): vuelca reglas activas del sistema a matriz versionada. Uso: npx tsx scripts/generate-matriz.ts [SALIDA] (default docs/anexos/matriz-reglas-v1.generada.md). No edita la matriz documental. */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { withholdingRules, withholdingConcepts } from "../src/db/schema";

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const out = process.argv[3] ?? join(root, "docs/anexos/matriz-reglas-v1.generada.md");
  const rules = await db.select().from(withholdingRules).where(eq(withholdingRules.status, "active"));
  const concepts = await db.select().from(withholdingConcepts);
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const rows = rules.map((r) => {
    const c = r.conceptId ? byId.get(r.conceptId) : null;
    return `| ${r.ruleKind} | ${c ? `${c.codigo} ${c.nombre}` : "—"} | ${r.legalReference ?? "sin fuente"} | ${r.effectiveRange} | % ${r.porcentaje}, sustraendo ${r.sustraendo}, base ${r.baseFormulaKind} | ${r.id} |`;
  });
  const body = `# Matriz generada desde el sistema (NO editada a mano)\n\n> Generada: ${new Date().toISOString()} · Reglas activas: ${rules.length}. La matriz documental firmada vive en \`matriz-reglas-v1.md\`; esta es su proyección verificable.\n\n| Tipo | Concepto | Fuente | Vigencia | Parámetros | ruleVersionId |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
  const hash = createHash("sha256").update(body).digest("hex");
  writeFileSync(out, `${body}\nsha256: \`${hash}\`\n`);
  console.log(`${rules.length} reglas → ${out}`);
  process.exit(0);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
