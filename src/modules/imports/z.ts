import Decimal from "decimal.js";
import { eq, and, desc } from "drizzle-orm";
import type { DrizzleTx } from "@/modules/tenancy/with-tenant";
import { fiscalMachines, zReports } from "@/db/schema";
import { parseCsv, normalizeDecimal, normalizeDate } from "./parse";

const ALIAS: Record<string, string[]> = {
  fecha: ["fecha", "date"],
  z: ["z", "numero_z", "n_z", "reporte"],
  maquina: ["maquina", "serial", "maquina_fiscal", "caja"],
  primera: ["primera", "desde", "inicial", "factura_desde"],
  ultima: ["ultima", "hasta", "final", "factura_hasta"],
  gravadas: ["gravadas", "ventas_gravadas", "base"],
  exentas: ["exentas", "ventas_exentas"],
  iva: ["iva", "impuesto"],
  total: ["total", "monto_total", "monto"],
};
const REQUIRED = ["fecha", "z", "maquina", "primera", "ultima", "gravadas", "total"] as const;

export type ZRow = {
  fecha: string; z: string; maquina: string; primera: string; ultima: string;
  gravadas: string; exentas: string; iva: string; total: string;
};

export function parseZCsv(bytes: Buffer): { headers: string[]; separator: string; rows: string[][] } {
  return parseCsv(bytes);
}

/** Valida filas Z: resuelve máquina (crea solo si createMissing), detecta dup y saltos (salto = advertencia). */
export async function validateZRows(
  tx: DrizzleTx,
  companyId: string,
  parsed: { headers: string[]; rows: string[][] },
  createMissing: boolean,
): Promise<{ rows: { rowNumber: number; status: string; errors: string[]; normalized: ZRow | null }[]; missing?: string }> {
  const col = (f: string) => parsed.headers.findIndex((h) => ALIAS[f]!.includes(h));
  const missing = REQUIRED.filter((f) => col(f) < 0);
  if (missing.length > 0) return { rows: [], missing: missing.join(", ") };
  const seen = new Set<string>();
  const out: { rowNumber: number; status: string; errors: string[]; normalized: ZRow | null }[] = [];
  // Continuidad por máquina: arranca en DB y avanza con las filas aceptadas del lote.
  const lastTo = new Map<string, string>();
  async function prevTo(machineId: string, serial: string): Promise<string | null> {
    if (!lastTo.has(serial)) {
      const last = await tx.select().from(zReports).where(and(eq(zReports.companyId, companyId), eq(zReports.machineId, machineId))).orderBy(desc(zReports.rangeTo)).limit(1);
      if (last[0]) lastTo.set(serial, last[0].rangeTo);
    }
    return lastTo.get(serial) ?? null;
  }
  let n = 0;
  for (const cells of parsed.rows) {
    n++;
    const get = (f: string) => (cells[col(f)] ?? "").trim();
    const errors: string[] = [];
    const fecha = normalizeDate(get("fecha"));
    if (!fecha) errors.push("fecha inválida");
    const z = get("z"), maquina = get("maquina"), primera = get("primera"), ultima = get("ultima");
    if (!z) errors.push("Z vacío");
    if (!maquina) errors.push("máquina vacía");
    if (!primera || !ultima) errors.push("rango incompleto");
    const gravadas = normalizeDecimal(get("gravadas")), exentas = normalizeDecimal(get("exentas") || "0") ?? "0.00";
    const iva = normalizeDecimal(get("iva") || "0") ?? "0.00";
    const total = normalizeDecimal(get("total"));
    if (gravadas === null) errors.push("gravadas inválidas");
    if (total === null) errors.push("total inválido");

    let normalized: ZRow | null = null;
    let status = "valid";
    if (errors.length === 0) {
      const diff = new Decimal(gravadas!).plus(exentas).plus(iva).minus(total!);
      // Z: total = gravadas + exentas + iva (tolerancia redondeo máquina)
      if (diff.abs().gt("1.00")) errors.push(`total no cuadra (dif ${diff.toFixed(2)})`);
      const key = `${maquina}|${z}`;
      if (seen.has(key)) errors.push("duplicado en archivo");
      else seen.add(key);

      let machine = (await tx.select().from(fiscalMachines).where(and(eq(fiscalMachines.companyId, companyId), eq(fiscalMachines.serial, maquina))).limit(1))[0];
      if (!machine && createMissing) {
        [machine] = await tx.insert(fiscalMachines).values({ companyId, serial: maquina }).returning();
      }
      if (machine) {
        const dup = await tx.select({ id: zReports.id }).from(zReports).where(and(eq(zReports.companyId, companyId), eq(zReports.machineId, machine.id), eq(zReports.zNumber, z))).limit(1);
        if (dup.length > 0) errors.push("Z duplicado en base de datos");
      }
      if (errors.length === 0) {
        // Continuidad contra DB (si la máquina existe) o contra filas previas del lote.
        const prev = machine ? await prevTo(machine.id, maquina) : (lastTo.get(maquina) ?? null);
        if (prev !== null && primera !== String(Number(prev) + 1)) status = "warning";
        normalized = { fecha: fecha!, z, maquina, primera, ultima, gravadas: gravadas!, exentas, iva, total: total! };
        lastTo.set(maquina, ultima);
      }
    }
    out.push({ rowNumber: n, status: errors.length ? "rejected" : status, errors, normalized });
  }
  return { rows: out };
}
