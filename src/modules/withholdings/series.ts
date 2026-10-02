import { sql } from "drizzle-orm";
import type { DrizzleTx } from "@/modules/tenancy/with-tenant";

/**
 * Reserva transaccional sin huecos (ADR-005): un solo UPSERT atómico sobre el
 * índice parcial (empresa, tipo, período) WHERE branch_id IS NULL.
 * Concurrentes se serializan en el lock de la fila; si la TX revierte, el
 * número no se consume. Sin reintentos: una sentencia no deja la TX abortada.
 */
export async function reserveNumber(
  tx: DrizzleTx,
  companyId: string,
  kind: "iva_withholding" | "islr_withholding",
  periodKey: string,
): Promise<number> {
  const rows = (await tx.execute(sql`
    INSERT INTO document_series (company_id, kind, period_key, last_number)
    VALUES (${companyId}, ${kind}, ${periodKey}, 1)
    ON CONFLICT (company_id, kind, period_key) WHERE branch_id IS NULL
    DO UPDATE SET last_number = document_series.last_number + 1
    RETURNING last_number
  `)) as unknown as { last_number: number }[];
  const n = Number(rows[0]?.last_number ?? NaN);
  if (!Number.isInteger(n) || n < 1) throw { code: "SERIES_EXHAUSTED", message: "Serie no disponible." };
  return n;
}

/** IVA: AAAAMMSSSSSSSS (14 car., providencia 2025). ISLR: provisional hasta G9. */
export function formatCertificate(kind: "iva_withholding" | "islr_withholding", periodKey: string, n: number): string {
  if (kind === "iva_withholding") return `${periodKey}${String(n).padStart(8, "0")}`;
  return `ISLR-${periodKey}-${String(n).padStart(6, "0")}`;
}

export function periodKeyFor(dateISO: string, kind: "monthly" | "biweekly" = "monthly"): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  if (kind === "monthly") return `${y}${String(m).padStart(2, "0")}`;
  return `${y}${String(m).padStart(2, "0")}-${d! <= 15 ? "Q1" : "Q2"}`;
}
