/** 5.1: evidencia de migración histórica por empresa. Uso: npx tsx scripts/migration-report.ts <RIF> */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { db } from "../src/db/client";
import {
  companies, sourceFiles, importBatches, importRows,
  purchaseDocuments, salesDocuments,
} from "../src/db/schema";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rif = process.argv[2];
if (!rif) {
  console.error("uso: migration-report.ts <RIF>");
  process.exit(1);
}
const RIF: string = rif;

async function main() {
  const [c] = await db.select().from(companies).where(eq(companies.rif, RIF.toUpperCase())).limit(1);
  if (!c) throw new Error("empresa no existe");
  const out = join(root, "migration-report", RIF.replace(/[^A-Za-z0-9]/g, ""));
  mkdirSync(out, { recursive: true });

  const files = await db.select().from(sourceFiles).where(eq(sourceFiles.companyId, c.id));
  const batches = await db.select().from(importBatches).where(eq(importBatches.companyId, c.id));
  const buys = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c.id));
  const sells = await db.select().from(salesDocuments).where(eq(salesDocuments.companyId, c.id));

  const csv = (rows: (string | number)[][]) => rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
  writeFileSync(join(out, "source-files.csv"), csv([["sha256", "nombre", "bytes"], ...files.map((f) => [f.sha256, f.originalName, f.sizeBytes])]));
  const counts: (string | number)[][] = [["lote", "tipo", "total", "validas", "advertencias", "rechazadas", "estado"]];
  for (const b of batches) {
    counts.push([b.id, b.kind, b.totalRows, b.validRows, b.warningRows, b.rejectedRows, b.status]);
  }
  writeFileSync(join(out, "row-counts.csv"), csv(counts));
  const tot = (xs: { baseImponible: string; ivaCausado: string; total: string }[]) => {
    const b = xs.reduce((a, d) => a.plus(d.baseImponible), new Decimal(0)).toFixed(2);
    const i = xs.reduce((a, d) => a.plus(d.ivaCausado), new Decimal(0)).toFixed(2);
    const t = xs.reduce((a, d) => a.plus(d.total), new Decimal(0)).toFixed(2);
    return [b, i, t];
  };
  writeFileSync(join(out, "totals-by-period.csv"), csv([
    ["tipo", "docs", "base", "iva", "total"],
    ["compras", buys.length, ...tot(buys)],
    ["ventas", sells.length, ...tot(sells)],
  ]));
  const rows = await db.select().from(importRows).limit(100000);
  const rej = rows.filter((r) => r.status === "rejected");
  writeFileSync(join(out, "differences.csv"), csv([["lote", "fila", "errores"], ...rej.map((r) => [r.batchId, r.rowNumber, JSON.stringify(r.errors)])]));
  writeFileSync(join(out, "migration-report.md"), `# Migración ${c.razonSocial} (${c.rif})\n\n- Fecha: ${new Date().toISOString()}\n- Archivos: ${files.length} · Lotes: ${batches.length}\n- Compras: ${buys.length} · Ventas: ${sells.length} · Rechazadas sin tratar: ${rej.length}\n- Trazabilidad: cada documento conserva source_file_id + row_number (ver origen en detalle de compra).\n`);
  console.log("reporte en", out);
  process.exit(0);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
