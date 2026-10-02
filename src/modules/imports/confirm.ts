import Decimal from "decimal.js";
import { eq, and } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { resolvePeriod } from "@/modules/periods/resolve";
import { record } from "@/modules/audit/record";
import { importBatches, importRows, fiscalMachines, zReports } from "@/db/schema";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { createSalesDocument } from "@/modules/sales/service";
import type { NormalizedRow } from "./validate";

export type Ctx = { companyId: string; userId: string };

/** Alícuota derivada iva/base a 6 decimales; iva 0 → exento. Supuesto F3 (contador valida). */
function deriveAlicuota(base: string, iva: string): string {
  if (new Decimal(iva).lte(0)) return "0";
  return new Decimal(iva).div(base).toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toString();
}

/**
 * Confirma lote validado: filas valid+warning → documentos con trazabilidad.
 * Una TX por fila (los servicios ya son transaccionales) + idempotencia por
 * estado `imported` y unique natural: re-ejecutar solo reintenta pendientes.
 */
export async function confirmImport(ctx: Ctx, batchId: string) {
  const meta = await withTenant(ctx, async (tx) => {
    const [batch] = await tx.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
    if (!batch || batch.companyId !== ctx.companyId) return null;
    if (batch.status !== "validated") return { error: "Valida el lote primero." as const };
    const rows = await tx.select().from(importRows).where(eq(importRows.batchId, batchId));
    return { batch, rows };
  });
  if (!meta) return { ok: false as const, error: { code: "NOT_FOUND", message: "Lote no existe." } };
  if ("error" in meta) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: meta.error } };

  let created = 0, skipped = 0;
  for (const r of meta.rows.sort((a, b) => a.rowNumber - b.rowNumber)) {
    if (r.status === "imported") {
      skipped++;
      continue;
    }
    if (r.status !== "valid" && r.status !== "warning") continue;

    if (meta.batch.kind === "purchases" || meta.batch.kind === "sales") {
      const n = r.normalized as unknown as NormalizedRow;
      const input = {
        partyRif: n.rif, partyRazon: n.razon || n.rif, docNumber: n.factura, controlNumber: n.control,
        fechaDocumento: n.fecha, fechaFiscal: n.fecha, baseImponible: n.base, ivaCausado: n.iva, total: n.total,
        alicuota: deriveAlicuota(n.base, n.iva),
        source: { fileId: meta.batch.sourceFileId, rowNumber: r.rowNumber, batchId },
      };
      const res = meta.batch.kind === "purchases"
        ? await createPurchaseDocument(ctx, input)
        : await createSalesDocument(ctx, input);
      if (!res.ok) {
        await withTenant(ctx, async (tx) => {
          await tx.update(importRows).set({ status: "rejected", errors: [res.error.code + ": " + res.error.message] }).where(eq(importRows.id, r.id));
        });
        continue;
      }
    } else if (meta.batch.kind === "z_reports") {
      const z = r.normalized as unknown as { fecha: string; z: string; maquina: string; primera: string; ultima: string; gravadas: string; exentas: string; iva: string; total: string };
      let failed: string | null = null;
      await withTenant(ctx, async (tx) => {
        let machine = (await tx.select().from(fiscalMachines).where(and(eq(fiscalMachines.companyId, ctx.companyId), eq(fiscalMachines.serial, z.maquina))).limit(1))[0];
        if (!machine) {
          [machine] = await tx.insert(fiscalMachines).values({ companyId: ctx.companyId, serial: z.maquina }).returning();
        }
        const periodId = await resolvePeriod(tx, ctx.companyId, z.fecha);
        try {
          await tx.insert(zReports).values({
            companyId: ctx.companyId, machineId: machine!.id, fiscalPeriodId: periodId, fecha: z.fecha,
            zNumber: z.z, rangeFrom: z.primera, rangeTo: z.ultima, ventasGravadas: z.gravadas,
            ventasExentas: z.exentas, iva: z.iva, total: z.total, sourceFileId: meta.batch.sourceFileId,
          });
        } catch (e) {
          if (typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23505")
            failed = "DUPLICATE_DOCUMENT: Z duplicado en base de datos.";
          else throw e;
        }
      }).catch((e: unknown) => {
        if (!failed) failed = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "ERROR";
      });
      if (failed) {
        await withTenant(ctx, async (tx) => {
          await tx.update(importRows).set({ status: "rejected", errors: [failed as string] }).where(eq(importRows.id, r.id));
        });
        continue;
      }
    } else {
      continue;
    }
    await withTenant(ctx, async (tx) => {
      await tx.update(importRows).set({ status: "imported" }).where(eq(importRows.id, r.id));
    });
    created++;
  }

  return withTenant(ctx, async (tx) => {
    const fresh = await tx.select().from(importRows).where(eq(importRows.batchId, batchId));
    const rej = fresh.filter((r) => r.status === "rejected").length;
    await tx.update(importBatches).set({ status: rej > 0 ? "partially_imported" : "completed" }).where(eq(importBatches.id, batchId));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "confirm", entityType: "import_batch", entityId: batchId, after: { created, skipped } }, `tx-confirm-${batchId}`);
    return { ok: true as const, created, skipped, rejected: rej };
  });
}

/** CSV de rechazadas para corrección (usa mapping guardado al validar). */
export async function rejectedCsv(ctx: Ctx, batchId: string): Promise<{ ok: true; csv: string } | { ok: false; error: { code: string; message: string } }> {
  return withTenant(ctx, async (tx) => {
    const [batch] = await tx.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
    if (!batch || batch.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Lote no existe." } };
    const profile = (batch.mappingProfile ?? {}) as { headers?: string[]; separator?: string };
    const rows = (await tx.select().from(importRows).where(eq(importRows.batchId, batchId))).filter((r) => r.status === "rejected");
    const sep = profile.separator ?? ",";
    const head = [...(profile.headers ?? []), "errores"].join(sep);
    const body = rows.map((r) => {
      const raw = (r.raw ?? []) as unknown as string[];
      const errs = Array.isArray(r.errors) ? (r.errors as string[]).join("; ") : "";
      return [...raw, errs].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(sep);
    });
    return { ok: true as const, csv: [head, ...body].join("\n") };
  });
}
