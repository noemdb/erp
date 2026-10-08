/**
 * Q-04: verifica que docs/DATABASE.md no documente columnas inexistentes
 * ni omita columnas físicas en las tablas críticas.
 *
 * Uso: `npm run docs:verify-schema` (tsx). Exit 1 si hay diferencias P1
 * (documentadas e inexistentes) en tablas críticas.
 *
 * Fuente física: último `drizzle/migrations/meta/*_snapshot.json`.
 * Limitación conocida: el journal llega a 0023 (RDF) pero solo hay snapshot
 * hasta 0021; `fiscal_decisions/*` y `withholding_rules.source_decision_id`
 * se excluyen con aviso en vez de compararse.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const DOC = join(ROOT, "docs", "DATABASE.md");
const META = join(ROOT, "drizzle", "migrations", "meta");

/** Tablas críticas doc -> tabla física (snapshot). */
const TABLES: Record<string, string> = {
  purchase_documents: "public.purchase_documents",
  payments: "public.payments",
  attachments: "public.attachments",
  companies: "public.companies",
  withholding_rules: "public.withholding_rules",
  iva_withholdings: "public.iva_withholdings",
  islr_withholdings: "public.islr_withholdings",
};

const SKIP_PHYSICAL = new Set(["fiscal_decisions", "fiscal_decision_links", "rdf_series"]);

function latestSnapshot(): string {
  const files = readdirSync(META)
    .filter((f) => /^\d+_snapshot\.json$/.test(f))
    .sort();
  if (files.length === 0) throw new Error("sin snapshots en drizzle/migrations/meta");
  return join(META, files[files.length - 1]!);
}

/** Columnas documentadas pero posteriores al último snapshot (journal sin snapshot). No son P1. */
const POST_SNAPSHOT = new Set(["withholding_rules.source_decision_id"]);

function documentedColumns(md: string, table: string): Set<string> | null {
  const lines = md.split("\n");
  const head = lines.findIndex(
    (l) => l.trim() === `#### \`${table}\`` || l.trim().startsWith(`#### \`${table}\``),
  );
  if (head === -1) return null;
  const cols = new Set<string>();
  for (let i = head + 1; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (l.startsWith("#### `") || l.startsWith("### ") || l.startsWith("## ")) break;
    const m = l.match(/^\|\s*([a-z][a-z0-9_]*)\s*\|/);
    if (m && m[1] !== "Columna") cols.add(m[1]!);
  }
  // La convención transversal (id/company_id/created_at/...) se asume, no se exige por tabla.
  return cols;
}

function main(): void {
  const md = readFileSync(DOC, "utf8");
  const snapPath = latestSnapshot();
  const snap = JSON.parse(readFileSync(snapPath, "utf8")) as {
    tables: Record<string, { columns: Record<string, unknown> }>;
  };
  console.log(`snapshot: ${snapPath.split("/").slice(-3).join("/")}`);

  let p1 = 0;
  for (const [doc, physical] of Object.entries(TABLES)) {
    if (SKIP_PHYSICAL.has(doc)) continue;
    const t = snap.tables[physical];
    if (!t) {
      console.log(`WARN ${doc}: sin tabla física ${physical} en snapshot`);
      continue;
    }
    const phys = new Set(Object.keys(t.columns));
    const documented = documentedColumns(md, doc);
    if (documented === null) {
      console.log(`WARN ${doc}: sin sección #### en DATABASE.md`);
      continue;
    }
    if (documented.size === 0) {
      console.log(`P3 ${doc}: sin tabla propia (solo prosa); físico: ${[...phys].sort().join(", ")}`);
      continue;
    }
    const docNotPhys = [...documented].filter((c) => !phys.has(c) && !POST_SNAPSHOT.has(`${doc}.${c}`));
    const postSnapshot = [...documented].filter((c) => !phys.has(c) && POST_SNAPSHOT.has(`${doc}.${c}`));
    const physNotDoc = [...phys].filter(
      (c) => !documented.has(c) && !["id", "company_id", "created_at", "updated_at"].includes(c),
    );
    if (postSnapshot.length > 0) {
      console.log(`AVISO ${doc}: posteriores al snapshot (mig. sin snapshot): ${postSnapshot.join(", ")}`);
    }
    if (docNotPhys.length > 0) {
      p1 += docNotPhys.length;
      console.log(`P1 ${doc}: documentadas e inexistentes: ${docNotPhys.join(", ")}`);
    }
    if (physNotDoc.length > 0) {
      console.log(`P3 ${doc}: físicas sin documentar: ${physNotDoc.join(", ")}`);
    }
    if (docNotPhys.length === 0 && physNotDoc.length === 0) console.log(`OK ${doc}`);
  }
  console.log("AVISO: snapshot llega a 0021; journal en 0023 (RDF). fiscal_decisions/links/rdf_series y withholding_rules.source_decision_id no se comparan aquí.");
  if (p1 > 0) {
    console.log(`FALLO: ${p1} columna(s) P1 documentadas e inexistentes.`);
    process.exit(1);
  }
  console.log("OK: sin diferencias P1 en tablas críticas.");
}

main();
