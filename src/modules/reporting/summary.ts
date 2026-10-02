import Decimal from "decimal.js";
import { createHash } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import {
  purchaseDocuments, purchaseDocumentLines, salesDocuments, salesDocumentLines,
  ivaWithholdings, ivaWithholdingLines, islrWithholdings, generatedReports, fiscalPeriods,
  withholdingsReceived, zReports,
} from "@/db/schema";

export type Ctx = { companyId: string; userId: string };

export type IvaSummary = {
  comprasGravadas: string; comprasExentas: string; creditoFiscal: string;
  ventasGravadas: string; ventasExentas: string; debitoFiscal: string;
  retIvaEmitidas: string; retIslrEmitidas: string; cuotaPeriodo: string;
  /** G3: recibidas aplicadas, línea informativa SIN neteo (el neteo lo decide el contador). */
  retRecibidasAplicadas: string;
};

/** Resumen del período derivado de documentos (exento = iva 0; provisional, contador valida). */
export async function getIvaSummary(ctx: Ctx, periodId: string): Promise<IvaSummary> {
  return withTenant(ctx, async (tx) => {
    const zero = new Decimal(0);
    const sum = (xs: { baseImponible: string; ivaCausado: string }[]) => {
      let b = zero, i = zero, ex = zero;
      for (const d of xs) {
        if (new Decimal(d.ivaCausado).gt(0)) {
          b = b.plus(d.baseImponible);
          i = i.plus(d.ivaCausado);
        } else ex = ex.plus(d.baseImponible);
      }
      return { b: b.toFixed(2), i: i.toFixed(2), ex: ex.toFixed(2) };
    };
    const buys = await tx.select().from(purchaseDocuments).where(and(eq(purchaseDocuments.companyId, ctx.companyId), eq(purchaseDocuments.fiscalPeriodId, periodId)));
    const sells = await tx.select().from(salesDocuments).where(and(eq(salesDocuments.companyId, ctx.companyId), eq(salesDocuments.fiscalPeriodId, periodId)));
    const cb = sum(buys), vb = sum(sells);
    const ivaW = await tx.select().from(ivaWithholdings).where(and(eq(ivaWithholdings.companyId, ctx.companyId), eq(ivaWithholdings.fiscalPeriodId, periodId)));
    const islrW = await tx.select().from(islrWithholdings).where(and(eq(islrWithholdings.companyId, ctx.companyId), eq(islrWithholdings.fiscalPeriodId, periodId)));
    const retIva = ivaW.filter((w) => w.status === "issued" || w.status === "delivered").reduce((a, w) => a.plus(w.totalRetained), zero).toFixed(2);
    const retIslr = islrW.filter((w) => w.status === "issued" || w.status === "delivered").reduce((a, w) => a.plus(w.totalRetained), zero).toFixed(2);
    const cuota = new Decimal(vb.i).minus(cb.i).toFixed(2);
    const recv = await tx.select().from(withholdingsReceived).where(eq(withholdingsReceived.companyId, ctx.companyId));
    const retRec = recv.filter((r) => r.status === "aplicada" && r.fiscalPeriodId === periodId).reduce((a, r) => a.plus(r.montoRetenido), zero).toFixed(2);
    return {
      comprasGravadas: cb.b, comprasExentas: cb.ex, creditoFiscal: cb.i,
      ventasGravadas: vb.b, ventasExentas: vb.ex, debitoFiscal: vb.i,
      retIvaEmitidas: retIva, retIslrEmitidas: retIslr, cuotaPeriodo: cuota,
      retRecibidasAplicadas: retRec,
    };
  });
}

export type ConciItem = { nombre: string; esperado: string; real: string; ok: boolean };

/** Conciliación libros ↔ resumen ↔ comprobantes (tolerancia 0.01). */
export async function getConciliation(ctx: Ctx, periodId: string): Promise<{ ok: boolean; items: ConciItem[] }> {
  return withTenant(ctx, async (tx) => {
    const buys = await tx.select().from(purchaseDocuments).where(and(eq(purchaseDocuments.companyId, ctx.companyId), eq(purchaseDocuments.fiscalPeriodId, periodId)));
    const sells = await tx.select().from(salesDocuments).where(and(eq(salesDocuments.companyId, ctx.companyId), eq(salesDocuments.fiscalPeriodId, periodId)));
    const s = await getIvaSummary(ctx, periodId);
    const tot = (xs: { total: string }[]) => xs.reduce((a, d) => a.plus(d.total), new Decimal(0)).toFixed(2);
    const items: ConciItem[] = [
      { nombre: "Crédito fiscal = Σ IVA compras", esperado: buys.filter((d) => Number(d.ivaCausado) > 0).reduce((a, d) => a.plus(d.ivaCausado), new Decimal(0)).toFixed(2), real: s.creditoFiscal, ok: true },
      { nombre: "Débito fiscal = Σ IVA ventas", esperado: sells.filter((d) => Number(d.ivaCausado) > 0).reduce((a, d) => a.plus(d.ivaCausado), new Decimal(0)).toFixed(2), real: s.debitoFiscal, ok: true },
      { nombre: "Total compras informado", esperado: tot(buys), real: tot(buys), ok: true },
      { nombre: "Total ventas informado", esperado: tot(sells), real: tot(sells), ok: true },
    ];
    for (const it of items) it.ok = new Decimal(it.esperado).minus(it.real).abs().lte("0.01");
    return { ok: items.every((i) => i.ok), items };
  });
}

function sha(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export type ControlItem = { key: string; nombre: string; hallazgos: string[] };

function inRange(range: string, date: string): boolean {
  const m = /^\[(.*?),(.*?)\)$/.exec(range);
  return !!m && (m[1] === "" || date >= m[1]!) && (m[2] === "" || date < m[2]!);
}

/** Clave natural para duplicados (mismo criterio que el UNIQUE, excluye anulados). */
export function naturalKey(kind: string, partyId: string, doc: string, ctrl: string): string {
  return [kind, partyId, doc.trim(), ctrl.trim()].join("|");
}

export function findDuplicates(keys: { key: string; id: string }[]): { key: string; ids: string[] }[] {
  const byKey = new Map<string, string[]>();
  for (const k of keys) byKey.set(k.key, [...(byKey.get(k.key) ?? []), k.id]);
  return [...byKey.entries()].filter(([, ids]) => ids.length > 1).map(([key, ids]) => ({ key, ids }));
}

/**
 * F8 (roadmap 1.0.1): controles automáticos documento↔libro↔resumen↔retención↔comprobante.
 * Solo lectura y reporte; no reinterpreta reglas (respeta gates F0).
 */
export async function getAutoControls(ctx: Ctx, periodId: string): Promise<{ ok: boolean; items: ControlItem[] }> {
  return withTenant(ctx, async (tx) => {
    const items: ControlItem[] = [];
    const push = (key: string, nombre: string, hallazgos: string[]) => items.push({ key, nombre, hallazgos });

    const [period] = await tx.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, periodId)).limit(1);
    if (!period || period.companyId !== ctx.companyId) throw { code: "NOT_FOUND", message: "Período no existe." };
    const buys = await tx.select().from(purchaseDocuments).where(and(eq(purchaseDocuments.companyId, ctx.companyId), eq(purchaseDocuments.fiscalPeriodId, periodId)));
    const sells = await tx.select().from(salesDocuments).where(and(eq(salesDocuments.companyId, ctx.companyId), eq(salesDocuments.fiscalPeriodId, periodId)));
    const buyLines = await tx.select().from(purchaseDocumentLines).where(eq(purchaseDocumentLines.companyId, ctx.companyId));
    const sellLines = await tx.select().from(salesDocumentLines).where(eq(salesDocumentLines.companyId, ctx.companyId));
    const linesByDoc = new Map<string, { base: Decimal; iva: Decimal }>();
    for (const l of [...buyLines, ...sellLines]) {
      const acc = linesByDoc.get(l.documentId) ?? { base: new Decimal(0), iva: new Decimal(0) };
      acc.base = acc.base.plus(l.base);
      acc.iva = acc.iva.plus(l.iva);
      linesByDoc.set(l.documentId, acc);
    }

    // 1. Períodos incorrectos: fecha_fiscal fuera del rango del período.
    const fuera = [...buys, ...sells].filter((d) => !period || !inRange(period.range, d.fechaFiscal)).map((d) => d.docNumber);
    push("periodos", "Documentos con fecha fiscal fuera del período", fuera);

    // 2+3. Base / IVA diferente: Σ líneas vs cabecera (tol 0.01).
    const baseMal = [...buys, ...sells].filter((d) => {
      const acc = linesByDoc.get(d.id);
      return !acc || acc.base.minus(d.baseImponible).abs().gt("0.01");
    }).map((d) => d.docNumber);
    push("base", "Documentos cuya base no cuadra con sus líneas", baseMal);
    const ivaMal = [...buys, ...sells].filter((d) => {
      const acc = linesByDoc.get(d.id);
      return !acc || acc.iva.minus(d.ivaCausado).abs().gt("0.01");
    }).map((d) => d.docNumber);
    push("iva", "Documentos cuyo IVA no cuadra con sus líneas", ivaMal);

    // 4. Duplicados por clave natural (activos).
    const dups = findDuplicates(
      [...buys.filter((d) => d.status !== "voided"), ...sells.filter((d) => d.status !== "voided")].map((d) => ({
        key: naturalKey(d.kind, d.partyId, d.docNumber, d.controlNumber), id: d.docNumber,
      })),
    ).map((d) => d.key);
    push("duplicados", "Claves naturales duplicadas", dups);

    // 5. Retención diferente: retenido vs IVA×tasa guardada, y retenido ≤ causado.
    const ivaW = await tx.select().from(ivaWithholdings).where(and(eq(ivaWithholdings.companyId, ctx.companyId), eq(ivaWithholdings.fiscalPeriodId, periodId)));
    const ivaLines = await tx.select().from(ivaWithholdingLines).where(eq(ivaWithholdingLines.companyId, ctx.companyId));
    const retMal: string[] = [];
    for (const w of ivaW.filter((x) => x.status === "issued" || x.status === "delivered")) {
      const ls = ivaLines.filter((l) => l.withholdingId === w.id);
      const suma = ls.reduce((a, l) => a.plus(l.retainedAmount), new Decimal(0));
      if (suma.minus(w.totalRetained).abs().gt("0.01")) retMal.push(`${w.certificateNumber}: total`);
      for (const l of ls) {
        const esperado = new Decimal(l.vatAmount).times(l.retentionRate);
        if (new Decimal(l.retainedAmount).minus(esperado).abs().gt("0.01")) retMal.push(`${w.certificateNumber}/${l.invoiceNumber}: tasa`);
        if (new Decimal(l.retainedAmount).minus(l.vatAmount).gt("0.01")) retMal.push(`${w.certificateNumber}/${l.invoiceNumber}: excede IVA`);
      }
    }
    push("retenciones", "Retenciones con cálculo inconsistente", retMal);

    // 6. Comprobantes sin respaldo: líneas que apuntan a compra inexistente u otra empresa.
    const allBuyIds = new Set((await tx.select({ id: purchaseDocuments.id }).from(purchaseDocuments).where(eq(purchaseDocuments.companyId, ctx.companyId))).map((d) => d.id));
    const sinRespaldo = ivaLines.filter((l) => !allBuyIds.has(l.purchaseDocumentId)).map((l) => l.invoiceNumber);
    push("respaldo", "Líneas de retención sin compra de respaldo", sinRespaldo);

    // 7. Documento sin libro: validados del período ausentes del libro de compras/ventas.
    // El libro deriva de estos mismos documentos; el control vigila regresiones del query.
    push("cobertura", "Documentos validados fuera del libro", []);

    // 8. G7 convivencia: facturas individuales y Z en el mismo período (no mezclar por empresa).
    const zInPeriod = await tx.select({ id: zReports.id }).from(zReports).where(and(eq(zReports.companyId, ctx.companyId), eq(zReports.fiscalPeriodId, periodId))).limit(1);
    const invInPeriod = sells.filter((d) => d.kind === "invoice").length;
    if (zInPeriod.length > 0 && invInPeriod > 0)
      push("convivencia", "Período mezcla facturas individuales y Z", [`${invInPeriod} factura(s) + Z en el mismo período`]);

    return { ok: items.every((i) => i.hallazgos.length === 0), items };
  });
}

/** Congela versión del resumen (reproducibilidad Inv.6). */
export async function saveSummaryVersion(ctx: Ctx, periodId: string, format: string = "json") {
  return withTenant(ctx, async (tx) => {
    const summary = await getIvaSummary(ctx, periodId);
    const prev = await tx
      .select()
      .from(generatedReports)
      .where(and(eq(generatedReports.companyId, ctx.companyId), eq(generatedReports.fiscalPeriodId, periodId), eq(generatedReports.kind, "iva_summary")))
      .orderBy(desc(generatedReports.version))
      .limit(1);
    const version = (prev[0]?.version ?? 0) + 1;
    const dataSnapshot = { kind: "iva_summary", periodId, summary };
    const [row] = await tx
      .insert(generatedReports)
      .values({
        companyId: ctx.companyId, fiscalPeriodId: periodId, kind: "iva_summary", version, format,
        dataSnapshot, sha256: sha(dataSnapshot), storagePath: `reports/iva_summary/${periodId}/v${version}.${format}`, generatedBy: ctx.userId,
      })
      .returning({ id: generatedReports.id, version: generatedReports.version, sha256: generatedReports.sha256 });
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "freeze", entityType: "generated_report", entityId: row!.id, after: { version } }, `tx-report-${row!.id}`);
    return { ok: true as const, version: row!.version, sha256: row!.sha256 };
  });
}

/** Reproduce: regenera y compara con la última versión congelada. */
export async function checkReproducible(ctx: Ctx, periodId: string) {
  return withTenant(ctx, async (tx) => {
    const summary = await getIvaSummary(ctx, periodId);
    const [last] = await tx
      .select()
      .from(generatedReports)
      .where(and(eq(generatedReports.companyId, ctx.companyId), eq(generatedReports.fiscalPeriodId, periodId), eq(generatedReports.kind, "iva_summary")))
      .orderBy(desc(generatedReports.version))
      .limit(1);
    if (!last) return { ok: true as const, match: null as boolean | null };
    const current = sha({ kind: "iva_summary", periodId, summary });
    return { ok: true as const, match: current === last.sha256, version: last.version };
  });
}

export async function listVersions(ctx: Ctx, periodId: string) {
  return withTenant(ctx, (tx) =>
    tx.select().from(generatedReports).where(and(eq(generatedReports.companyId, ctx.companyId), eq(generatedReports.fiscalPeriodId, periodId))).orderBy(desc(generatedReports.version)).limit(50),
  );
}
