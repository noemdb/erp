import { and, desc, eq } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { generatedReports } from "@/db/schema";
import { contentHash } from "@/modules/shared/canonical";
import { getPurchaseBook } from "@/modules/fiscal-docs/service";
import { getSalesBook } from "@/modules/sales/service";
import { getConciliation, getIvaSummary } from "./summary";
import { getIvaWithholdingsReport } from "@/modules/withholdings/issue-iva";
import { getIslrWithholdingsReport } from "@/modules/withholdings/issue-islr";

export type Ctx = { companyId: string; userId: string };

export const CLOSING_PACKAGE_KIND = "closing_package";

/** Una sección del paquete: conteo + hash del contenido (las filas se descargan por su ruta CSV). */
export type PackageSection = { kind: string; count: number; sha256: string };

export type ClosingPackage = {
  periodId: string;
  sections: PackageSection[];
  summary: unknown;
  conciliation: unknown;
  sha256: string;
};

/** Hash de una sección. Puro, testeable sin DB. */
export function sectionSha(kind: string, data: unknown): string {
  return contentHash({ kind, data });
}

/** Manifiesto del paquete sin hashes globales. Puro, testeable sin DB. */
export function buildPackage(periodId: string, sections: PackageSection[], summary: unknown, conciliation: unknown): ClosingPackage {
  const sha256 = contentHash({ periodId, sections, summary, conciliation });
  return { periodId, sections, summary, conciliation, sha256 };
}

/** Reúne los 6 reportes del período en un manifiesto con hashes. Solo lectura. */
export async function getClosingPackage(ctx: Ctx, periodId: string): Promise<ClosingPackage> {
  const [purchases, sales, summary, conciliation, ivaW, islrW] = await Promise.all([
    getPurchaseBook(ctx, periodId),
    getSalesBook(ctx, periodId),
    getIvaSummary(ctx, periodId),
    getConciliation(ctx, periodId),
    getIvaWithholdingsReport(ctx, periodId),
    getIslrWithholdingsReport(ctx, periodId),
  ]);
  const sections: PackageSection[] = [
    { kind: "purchase_book", count: purchases.length, sha256: sectionSha("purchase_book", purchases) },
    { kind: "sales_book", count: sales.length, sha256: sectionSha("sales_book", sales) },
    { kind: "iva_summary", count: 1, sha256: sectionSha("iva_summary", summary) },
    { kind: "conciliation", count: conciliation.items.length, sha256: sectionSha("conciliation", conciliation) },
    { kind: "iva_withholdings", count: ivaW.length, sha256: sectionSha("iva_withholdings", ivaW) },
    { kind: "islr_withholdings", count: islrW.length, sha256: sectionSha("islr_withholdings", islrW) },
  ];
  return buildPackage(periodId, sections, summary, conciliation);
}

/** Congela el manifiesto como versión (reproducibilidad Inv.6). Solo contador (vía action). */
export async function freezeClosingPackage(ctx: Ctx, periodId: string) {
  const pkg = await getClosingPackage(ctx, periodId);
  return withTenant(ctx, async (tx) => {
    const prev = await tx
      .select()
      .from(generatedReports)
      .where(and(eq(generatedReports.companyId, ctx.companyId), eq(generatedReports.fiscalPeriodId, periodId), eq(generatedReports.kind, CLOSING_PACKAGE_KIND)))
      .orderBy(desc(generatedReports.version))
      .limit(1);
    const version = (prev[0]?.version ?? 0) + 1;
    const [row] = await tx
      .insert(generatedReports)
      .values({
        companyId: ctx.companyId, fiscalPeriodId: periodId, kind: CLOSING_PACKAGE_KIND, version, format: "json",
        dataSnapshot: { periodId, sections: pkg.sections, summary: pkg.summary, conciliation: pkg.conciliation },
        sha256: pkg.sha256, storagePath: `reports/closing_package/${periodId}/v${version}.json`, generatedBy: ctx.userId,
      })
      .returning({ id: generatedReports.id, version: generatedReports.version, sha256: generatedReports.sha256 });
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "freeze", entityType: "generated_report", entityId: row!.id, after: { kind: CLOSING_PACKAGE_KIND, version } }, `tx-report-${row!.id}`);
    return { ok: true as const, version: row!.version, sha256: row!.sha256 };
  });
}

/** Reproduce: recompone el manifiesto y lo compara con la última versión congelada. */
export async function checkPackageReproducible(ctx: Ctx, periodId: string) {
  const pkg = await getClosingPackage(ctx, periodId);
  return withTenant(ctx, async (tx) => {
    const [last] = await tx
      .select()
      .from(generatedReports)
      .where(and(eq(generatedReports.companyId, ctx.companyId), eq(generatedReports.fiscalPeriodId, periodId), eq(generatedReports.kind, CLOSING_PACKAGE_KIND)))
      .orderBy(desc(generatedReports.version))
      .limit(1);
    if (!last) return { ok: true as const, match: null as boolean | null };
    return { ok: true as const, match: pkg.sha256 === last.sha256, version: last.version };
  });
}
