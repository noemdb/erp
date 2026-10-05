import Decimal from "decimal.js";
import { eq, and, ne } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { sourceFiles, importBatches, importRows, parties, purchaseDocuments, salesDocuments } from "@/db/schema";
import { parseCsv, normalizeDecimal, normalizeDate, isNullish } from "./parse";
import { validateZRows } from "./z";
import { normalizeRif } from "@/modules/fiscal-docs/service";

export type Ctx = { companyId: string; userId: string };

const ALIAS: Record<string, string[]> = {
  fecha: ["fecha", "fecha_factura", "fecha_documento", "date", "emision"],
  rif: ["rif", "rif_proveedor", "rif_cliente", "documento"],
  razon: ["razon_social", "razon", "nombre", "nombre_proveedor", "proveedor", "cliente"],
  factura: ["factura", "numero_factura", "n_factura", "documento_n"],
  control: ["control", "numero_control", "n_control"],
  base: ["base", "base_imponible", "subtotal", "gravable"],
  iva: ["iva", "iva_causado", "monto_iva", "impuesto"],
  total: ["total", "total_factura", "monto_total", "monto"],
};
const REQUIRED = ["fecha", "rif", "factura", "control", "base", "iva", "total"] as const;

/**
 * Columnas legacy con significado fiscal que la importación NO consume.
 * No se ignoran en silencio: `tipo_doc`/`abono` generan hallazgo por fila y
 * `alicuota`/`fecha_recepcion` quedan registradas en
 * `mapping_profile.ignoredColumns` para mostrarse en el detalle del lote.
 */
const EXTRA_ALIAS: Record<"tipoDoc" | "abono" | "alicuota" | "recepcion", string[]> = {
  tipoDoc: ["tipo_doc", "tipo", "kind"],
  abono: ["abono_en_cuenta", "abono"],
  alicuota: ["alicuota_iva", "aliquota_iva", "alicuota", "aliquota"],
  recepcion: ["fecha_recepcion"],
};

function colIndex(headers: string[], field: string): number {
  return headers.findIndex((h) => ALIAS[field]!.includes(h));
}

export type NormalizedRow = {
  fecha: string; rif: string; rifOriginal: string; razon: string;
  factura: string; control: string; base: string; iva: string; total: string;
};

/** Valida lote purchases|sales: parsea, normaliza, marca valid/warning/rejected y actualiza contadores. */
export async function validateBatch(ctx: Ctx, batchId: string) {
  return withTenant(ctx, async (tx) => {
    const [batch] = await tx.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
    if (!batch || batch.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Lote no existe." } };
    if (batch.kind !== "purchases" && batch.kind !== "sales" && batch.kind !== "z_reports")
      return { ok: false as const, error: { code: "VALIDATION_ERROR", message: `Tipo ${batch.kind} aún no soportado.` } };
    const [sf] = await tx.select().from(sourceFiles).where(eq(sourceFiles.id, batch.sourceFileId)).limit(1);
    if (!sf) return { ok: false as const, error: { code: "NOT_FOUND", message: "Archivo no existe." } };

    const content: Buffer = Buffer.isBuffer(sf.content) ? sf.content : Buffer.from(sf.content as unknown as string);

    if (batch.kind === "z_reports") {
      let zparsed;
      try {
        zparsed = parseCsv(content);
      } catch {
        return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "CSV ilegible o vacío." } };
      }
      await tx.delete(importRows).where(and(eq(importRows.batchId, batchId), ne(importRows.status, "imported")));
      const zres = await validateZRows(tx, ctx.companyId, zparsed, false);
      if (zres.missing)
        return { ok: false as const, error: { code: "VALIDATION_ERROR", message: `Columnas Z faltantes: ${zres.missing}.` } };
      let valid = 0, warning = 0, rejected = 0;
      for (const r of zres.rows) {
        if (r.status === "valid") valid++;
        else if (r.status === "warning") warning++;
        else rejected++;
        await tx.insert(importRows).values({
          companyId: ctx.companyId, batchId, rowNumber: r.rowNumber,
          raw: [] as unknown as Record<string, unknown>,
          normalized: r.normalized as unknown as Record<string, unknown>,
          errors: r.errors.length ? r.errors : null,
          status: r.status,
        });
      }
      await tx.update(importBatches).set({ totalRows: zres.rows.length, validRows: valid, warningRows: warning, rejectedRows: rejected, status: "validated", mappingProfile: { headers: zparsed.headers, separator: ",", ignoredColumns: [] } }).where(eq(importBatches.id, batchId));
      return { ok: true as const, total: zres.rows.length, valid, warning, rejected };
    }

    let parsed;
    try {
      parsed = parseCsv(content);
    } catch {
      return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "CSV ilegible o vacío." } };
    }
    const missing = REQUIRED.filter((f) => colIndex(parsed.headers, f) < 0);
    if (missing.length > 0)
      return { ok: false as const, error: { code: "VALIDATION_ERROR", message: `Columnas faltantes: ${missing.join(", ")}.` } };

    const extraIdx = (names: string[]) => parsed.headers.findIndex((h) => names.includes(h));
    const tipoDocIdx = extraIdx(EXTRA_ALIAS.tipoDoc);
    const abonoIdx = extraIdx(EXTRA_ALIAS.abono);
    // Informativas: se registran en mapping_profile.ignoredColumns, no por fila.
    const ignoredColumns = (["alicuota", "recepcion"] as const)
      .map((k) => {
        const i = extraIdx(EXTRA_ALIAS[k]);
        return i >= 0 ? parsed.headers[i]! : null;
      })
      .filter((h): h is string => h !== null);

    await tx.delete(importRows).where(and(eq(importRows.batchId, batchId), ne(importRows.status, "imported")));
    const imported = new Set(
      (await tx.select({ rowNumber: importRows.rowNumber }).from(importRows).where(and(eq(importRows.batchId, batchId), eq(importRows.status, "imported")))).map((r) => r.rowNumber),
    );
    const seen = new Set<string>();
    let valid = 0, warning = 0, rejected = 0;

    const table = batch.kind === "purchases" ? purchaseDocuments : salesDocuments;
    let n = 0;
    for (const cells of parsed.rows) {
      n++;
      if (imported.has(n)) continue; // ya importada: se conserva, no se revalida
      const get = (f: string) => (cells[colIndex(parsed.headers, f)] ?? "").trim();
      const errors: string[] = [];
      const avisos: string[] = [];
      const fecha = normalizeDate(get("fecha"));
      if (!fecha) errors.push("fecha inválida");
      const rifRaw = get("rif");
      const rifOk = /^[VEJPG]-?\d{8,9}-?\d?$/i.test(rifRaw);
      if (!rifOk) errors.push("RIF inválido");
      const rif = rifOk ? normalizeRif(rifRaw) : rifRaw;
      const factura = get("factura"), control = get("control");
      if (!factura) errors.push("factura vacía");
      if (!control) errors.push("control vacío");
      const base = normalizeDecimal(get("base")), iva = normalizeDecimal(get("iva")), total = normalizeDecimal(get("total"));
      if (base === null) errors.push("base inválida");
      if (iva === null) errors.push("IVA inválido");
      if (total === null) errors.push("total inválido");

      let status = "valid";
      let terceroNuevo = false;
      if (errors.length === 0) {
        if (base !== null && iva !== null && total !== null) {
          const diff = new Decimal(base).plus(iva).minus(total).abs();
          if (diff.gt("0.01")) errors.push(`total no cuadra (dif ${diff.toFixed(2)})`);
        }
        const key = `${rif}|${factura}|${control}`;
        if (seen.has(key)) errors.push("duplicada en archivo");
        else seen.add(key);

        // tipo_doc distinto de factura no puede importarse: NC/ND exigen
        // documento afectado (MISSING_AFFECTED_DOCUMENT) y se registrarían
        // como factura común si se dejaran pasar.
        if (tipoDocIdx >= 0) {
          const rawTipo = (cells[tipoDocIdx] ?? "").trim();
          if (rawTipo && !["F", "FACTURA", "INVOICE"].includes(rawTipo.toUpperCase()))
            errors.push(`tipo_doc '${rawTipo}' no soportado en importación (NC/ND requieren documento afectado; regístrela manual)`);
        }
        // Abono en cuenta ≠ 0: el documento se importa, pero el abono exige
        // evento de liquidación manual (G2, createSettlementEvent + allocate).
        if (abonoIdx >= 0) {
          const rawAbono = (cells[abonoIdx] ?? "").trim();
          if (rawAbono !== "") {
            const abonoVal = normalizeDecimal(rawAbono);
            if (abonoVal === null) errors.push("abono_en_cuenta inválido");
            else if (!new Decimal(abonoVal).eq(0))
              avisos.push(`abono_en_cuenta ${abonoVal}: requiere evento de liquidación manual (G2); el documento se importa sin el abono`);
          }
        }

        const [party] = await tx.select({ id: parties.id }).from(parties).where(and(eq(parties.companyId, ctx.companyId), eq(parties.rif, rif))).limit(1);
        if (!party) {
          terceroNuevo = true;
        } else {
          const dup = await tx.select({ id: table.id }).from(table).where(
            and(eq(table.companyId, ctx.companyId), eq(table.partyId, party.id), eq(table.docNumber, factura), eq(table.controlNumber, control)),
          ).limit(1);
          if (dup.length > 0) errors.push("duplicada en base de datos");
        }
      }
      if (errors.length > 0) {
        status = "rejected";
        rejected++;
      } else if (terceroNuevo || avisos.length > 0) {
        status = "warning";
        warning++;
      } else valid++;

      const razonRaw = get("razon");
      const normalized: NormalizedRow | null = errors.length > 0 ? null : {
        fecha: fecha!, rif, rifOriginal: rifRaw, razon: isNullish(razonRaw) ? "" : razonRaw,
        factura, control, base: base!, iva: iva!, total: total!,
      };
      await tx.insert(importRows).values({
        companyId: ctx.companyId, batchId, rowNumber: n,
        raw: cells as unknown as Record<string, unknown>,
        normalized: normalized as unknown as Record<string, unknown>,
        errors: errors.length > 0 || avisos.length > 0
          ? [...errors, ...avisos.map((a) => `aviso: ${a}`)]
          : null,
        status,
      });
    }

    await tx.update(importBatches).set({ totalRows: n, validRows: valid, warningRows: warning, rejectedRows: rejected, status: "validated", mappingProfile: { headers: parsed.headers, separator: parsed.separator, ignoredColumns } }).where(eq(importBatches.id, batchId));
    return { ok: true as const, total: n, valid, warning, rejected };
  });
}
