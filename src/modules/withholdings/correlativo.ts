import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { documentSeries } from "@/db/schema";
import { getIvaWithholdingsReport } from "./issue-iva";
import { getIslrWithholdingsReport } from "./issue-islr";
import { findCorrelativoGaps, type CorrelativoGaps } from "./correlativo-gaps";

export type { CorrelativoGaps, CorrelativoGroup, CorrelativoRow } from "./correlativo-gaps";

export type Ctx = { companyId: string; userId: string };
export type CorrelativoKind = "iva" | "islr";
const SEQ_LEN: Record<CorrelativoKind, 8 | 6> = { iva: 8, islr: 6 };
const SERIES_KIND: Record<CorrelativoKind, string> = { iva: "iva_withholding", islr: "islr_withholding" };

export type SerieCruce = {
  prefix: string;
  maxSecuencia: number;
  ultimoSerie: number | null;
  estado: "ok" | "serie-mayor" | "serie-menor" | "sin-serie" | "varias-series";
};

export type CorrelativoReport = CorrelativoGaps & {
  kind: CorrelativoKind;
  totales: { emitidos: number; entregados: number; anulados: number; retenidoVigente: string };
  series: SerieCruce[];
};

/** Correlativo del período (o toda la empresa): huecos + totales + cruce con `document_series`. Solo lectura. */
export async function getCorrelativo(ctx: Ctx, kind: CorrelativoKind, periodId?: string): Promise<CorrelativoReport> {
  const rows =
    kind === "iva" ? await getIvaWithholdingsReport(ctx, periodId) : await getIslrWithholdingsReport(ctx, periodId);
  const gaps = findCorrelativoGaps(rows, SEQ_LEN[kind]);
  const zero = new Decimal(0);
  const vigentes = rows.filter((r) => r.status === "issued" || r.status === "delivered");
  const totales = {
    emitidos: rows.filter((r) => r.status === "issued").length,
    entregados: rows.filter((r) => r.status === "delivered").length,
    anulados: rows.filter((r) => r.status === "voided").length,
    retenidoVigente: vigentes.reduce((a, r) => a.plus(r.totalRetained || 0), zero).toFixed(2),
  };
  const series = await withTenant(ctx, async (tx) => {
    const all = await tx
      .select()
      .from(documentSeries)
      .where(and(eq(documentSeries.companyId, ctx.companyId), eq(documentSeries.kind, SERIES_KIND[kind])));
    return gaps.groups.map((g) => {
      const maxSecuencia = g.maxSeq;
      const match = all.filter((s) => s.periodKey === g.prefix);
      if (match.length === 0) return { prefix: g.prefix, maxSecuencia, ultimoSerie: null, estado: "sin-serie" as const };
      if (match.length > 1)
        return { prefix: g.prefix, maxSecuencia, ultimoSerie: null, estado: "varias-series" as const };
      const ultimoSerie = match[0]!.lastNumber;
      const estado = (
        ultimoSerie === maxSecuencia ? "ok" : ultimoSerie > maxSecuencia ? "serie-mayor" : "serie-menor"
      ) as SerieCruce["estado"];
      return { prefix: g.prefix, maxSecuencia, ultimoSerie, estado };
    });
  });
  return { kind, ...gaps, totales, series };
}
