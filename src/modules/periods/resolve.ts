import { eq, and, sql } from "drizzle-orm";
import type { DrizzleTx } from "@/modules/tenancy/with-tenant";
import { fiscalPeriods } from "@/db/schema";

/** Período mensual abierto que contiene fecha_fiscal; lo crea si no existe. Cerrado → throw PERIOD_CLOSED. */
export function monthRange(fechaFiscal: string): string {
  const [y, m] = fechaFiscal.split("-").slice(0, 2) as [string, string];
  const next = m === "12" ? `${Number(y) + 1}-01` : `${y}-${String(Number(m) + 1).padStart(2, "0")}`;
  return `[${y}-${m}-01,${next}-01)`;
}

export async function resolvePeriod(tx: DrizzleTx, companyId: string, fechaFiscal: string): Promise<string> {
  const range = monthRange(fechaFiscal);
  // UPSERT atómico (unique total, sin NULLs): la carrera se resuelve en el lock, sin reintentos.
  await tx.execute(sql`
    INSERT INTO fiscal_periods (company_id, kind, range, status)
    VALUES (${companyId}, 'monthly', ${range}, 'open')
    ON CONFLICT (company_id, kind, range) DO NOTHING
  `);
  const rows = await tx
    .select()
    .from(fiscalPeriods)
    .where(and(eq(fiscalPeriods.companyId, companyId), eq(fiscalPeriods.kind, "monthly"), eq(fiscalPeriods.range, range)))
    .limit(1);
  const found = rows[0];
  if (!found) throw { code: "PERIOD_CLOSED", message: "No se pudo resolver el período (reintenta)." };
  if (found.status === "closed") throw { code: "PERIOD_CLOSED", message: "Período cerrado." };
  return found.id;
}
