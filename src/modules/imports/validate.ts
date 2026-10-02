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
  razon: ["razon_social", "razon", "nombre", "proveedor", "cliente"],
  factura: ["factura", "numero_factura", "n_factura", "documento_n"],
  control: ["control", "numero_control", "n_control"],
  base: ["base", "base_imponible", "subtotal", "gravable"],
  iva: ["iva", "iva_causado", "impuesto"],
  total: ["total", "monto_total", "monto"],
};
const REQUIRED = ["fecha", "rif", "factura", "control", "base", "iva", "total"] as const;

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
      await tx.update(importBatches).set({ totalRows: zres.rows.length, validRows: valid, warningRows: warning, rejectedRows: rejected, status: "validated", mappingProfile: { headers: zparsed.headers, separator: "," } }).where(eq(importBatches.id, batchId));
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
      } else if (terceroNuevo) {
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
        errors: errors.length ? errors : null,
        status,
      });
    }

    await tx.update(importBatches).set({ totalRows: n, validRows: valid, warningRows: warning, rejectedRows: rejected, status: "validated", mappingProfile: { headers: parsed.headers, separator: parsed.separator } }).where(eq(importBatches.id, batchId));
    return { ok: true as const, total: n, valid, warning, rejected };
  });
}
