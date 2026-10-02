/** 2.0.2 ítem 5 fase A: reporte de autodetección sobre cualquier CSV (gatillo documentado). Uso: npx tsx scripts/autodetect-report.ts <archivo> [purchases|sales|z_reports] */
import { readFileSync } from "node:fs";
import { parseCsv, normalizeDecimal, normalizeDate } from "../src/modules/imports/parse";

const ALIAS: Record<string, string[]> = {
  fecha: ["fecha", "fecha_factura", "fecha_documento", "date", "emision"],
  rif: ["rif", "rif_proveedor", "rif_cliente", "documento"],
  factura: ["factura", "numero_factura", "n_factura"],
  control: ["control", "numero_control", "n_control"],
  base: ["base", "base_imponible", "subtotal", "gravable"],
  iva: ["iva", "iva_causado", "impuesto"],
  total: ["total", "monto_total", "monto"],
  z: ["z", "numero_z", "reporte"], maquina: ["maquina", "serial", "maquina_fiscal"],
  primera: ["primera", "desde", "inicial"], ultima: ["ultima", "hasta", "final"],
};

const [file, kind] = [process.argv[2], process.argv[3] ?? "purchases"];
if (!file) {
  console.error("uso: autodetect-report.ts <archivo> [purchases|sales|z_reports]");
  process.exit(1);
}
const bytes = readFileSync(file);
const parsed = parseCsv(bytes);
const need = kind === "z_reports"
  ? ["fecha", "z", "maquina", "primera", "ultima"]
  : ["fecha", "rif", "factura", "control", "base", "iva", "total"];
const col = (f: string) => parsed.headers.findIndex((h) => (ALIAS[f] ?? [f]).includes(h));
console.log(`separador: ${JSON.stringify(parsed.separator)} · columnas: ${parsed.headers.length} · filas: ${parsed.rows.length}`);
let missing = 0;
for (const f of need) {
  const i = col(f);
  console.log(`- ${f}: ${i >= 0 ? `columna ${i}` : "NO DETECTADA"}`);
  if (i < 0) missing++;
}
let valid = 0;
for (const cells of parsed.rows.slice(0, 200)) {
  const get = (f: string) => { const i = col(f); return i >= 0 ? (cells[i] ?? "").trim() : ""; };
  let ok = missing === 0;
  if (ok && kind !== "z_reports") {
    if (!normalizeDate(get("fecha"))) ok = false;
    if (!/^[VEJPG]-?\d{8,9}-?\d?$/i.test(get("rif"))) ok = false;
    for (const f of ["base", "total"]) if (normalizeDecimal(get(f)) === null) ok = false;
    const ivaRaw = get("iva");
    if (ivaRaw !== "" && normalizeDecimal(ivaRaw) === null) ok = false;
  }
  if (ok) valid++;
}
const pct = parsed.rows.length === 0 ? 0 : Math.round((valid / Math.min(parsed.rows.length, 200)) * 100);
console.log(`filas válidas (muestra): ${valid} (${pct}%)`);
console.log(missing > 0 ? "GATILLO 1: columna requerida no autodetectada → evaluar perfiles." : "Gatillo 1: no se dispara.");
console.log("Gatillos 2–4 (layouts/transformaciones/tasa<98%): decidir con este reporte + mes real.");
