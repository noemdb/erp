import Decimal from "decimal.js";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { resolvePeriod } from "@/modules/periods/resolve";
import { puedeAplicarNotaCredito } from "@/modules/tax-engine/compute";
import { record } from "@/modules/audit/record";
import { companies, parties, salesDocuments, salesDocumentLines, fiscalMachines, zReports } from "@/db/schema";
import { normalizeRif } from "@/modules/fiscal-docs/service";

const MoneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido (usa punto decimal)");

export const CreateSaleSchema = z.object({
  kind: z.enum(["invoice", "credit_note", "debit_note", "export", "third_party"]).default("invoice"),
  partyRif: z.string().min(3).max(20),
  partyRazon: z.string().min(2).max(200),
  docNumber: z.string().min(1).max(50),
  controlNumber: z.string().min(1).max(50),
  affectedDocumentId: z.string().uuid().optional(),
  fechaDocumento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFiscal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baseImponible: MoneySchema,
  ivaCausado: MoneySchema,
  total: MoneySchema,
  alicuota: z.string().regex(/^\d+(\.\d{1,6})?$/).default("16"),
  source: z.object({ fileId: z.string().uuid(), rowNumber: z.number(), batchId: z.string().uuid() }).optional(),
});

export type Ctx = { companyId: string; userId: string };

export async function createSalesDocument(ctx: Ctx, raw: z.input<typeof CreateSaleSchema>) {
  const parsed = CreateSaleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  const input = parsed.data;
  const needsAffected = input.kind === "credit_note" || input.kind === "debit_note";
  if (needsAffected && !input.affectedDocumentId)
    return { ok: false as const, error: { code: "MISSING_AFFECTED_DOCUMENT", message: "NC/ND requieren documento afectado." } };

  const diff = new Decimal(input.baseImponible).plus(input.ivaCausado).minus(input.total).abs();
  if (diff.gt("0.01"))
    return { ok: false as const, error: { code: "TOTAL_MISMATCH", message: `Base + IVA debe igualar total (dif ${diff.toFixed(2)}).` } };

  try {
    return await withTenant(ctx, async (tx) => {
      const rif = normalizeRif(input.partyRif);
      let party = (await tx.select().from(parties).where(and(eq(parties.companyId, ctx.companyId), eq(parties.rif, rif))).limit(1))[0];
      if (!party) {
        [party] = await tx
          .insert(parties)
          .values({ companyId: ctx.companyId, rif, rifOriginal: input.partyRif, razonSocial: input.partyRazon })
          .returning();
      } else if (party.status !== "active") {
        throw { code: "VALIDATION_ERROR", message: "Tercero inactivo." };
      }

      if (input.kind === "credit_note" && input.affectedDocumentId) {
        const [aff] = await tx.select().from(salesDocuments).where(eq(salesDocuments.id, input.affectedDocumentId)).limit(1);
        if (!aff || aff.companyId !== ctx.companyId)
          throw { code: "VALIDATION_ERROR", message: "Documento afectado no existe." };
        const prev = await tx.select().from(salesDocuments).where(eq(salesDocuments.affectedDocumentId, input.affectedDocumentId));
        const usadas = prev.reduce((a, p) => a.plus(p.total), new Decimal(0));
        const saldo = new Decimal(aff.total).minus(usadas).toFixed(2);
        if (!puedeAplicarNotaCredito(saldo, input.total))
          throw { code: "CREDIT_NOTE_EXCEEDS_BALANCE", message: `NC excede saldo disponible (${saldo}).` };
      }

      const periodId = await resolvePeriod(tx, ctx.companyId, input.fechaFiscal);
      const [doc] = await tx
        .insert(salesDocuments)
        .values({
          companyId: ctx.companyId,
          fiscalPeriodId: periodId,
          kind: input.kind,
          partyId: party!.id,
          docNumber: input.docNumber,
          controlNumber: input.controlNumber,
          affectedDocumentId: input.affectedDocumentId ?? null,
          fechaDocumento: input.fechaDocumento,
          fechaFiscal: input.fechaFiscal,
          baseImponible: input.baseImponible,
          ivaCausado: input.ivaCausado,
          total: input.total,
          status: "validated",
          sourceFileId: input.source?.fileId ?? null,
          sourceRowNumber: input.source?.rowNumber ?? null,
          importBatchId: input.source?.batchId ?? null,
        })
        .returning({ id: salesDocuments.id });
      await tx.insert(salesDocumentLines).values({
        companyId: ctx.companyId,
        documentId: doc!.id,
        lineNumber: 1,
        taxCategory: "general",
        taxRate: input.alicuota,
        base: input.baseImponible,
        iva: input.ivaCausado,
      });
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "create", entityType: "sales_document", entityId: doc!.id, after: input }, `tx-sale-${doc!.id}`);
      return { ok: true as const, id: doc!.id };
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code: unknown }).code;
      if (code === "23505") return { ok: false as const, error: { code: "DUPLICATE_DOCUMENT", message: "Documento duplicado." } };
      if (typeof code === "string") return { ok: false as const, error: e as { code: string; message: string } };
    }
    throw e;
  }
}

export type SalesBookRow = { fechaFiscal: string; kind: string; rif: string; razonSocial: string; docNumber: string; baseImponible: string; ivaCausado: string; total: string };

export async function getSalesBook(ctx: Ctx, periodId?: string): Promise<SalesBookRow[]> {
  return withTenant(ctx, async (tx) => {
    const [company] = await tx.select().from(companies).where(eq(companies.id, ctx.companyId)).limit(1);
    // G7: en modo Z el libro deriva de reportes Z (conservan identidad propia), no de facturas.
    if (company?.salesMode === "z") {
      const zs = await tx
        .select()
        .from(zReports)
        .where(periodId ? and(eq(zReports.companyId, ctx.companyId), eq(zReports.fiscalPeriodId, periodId)) : eq(zReports.companyId, ctx.companyId));
      const out: SalesBookRow[] = [];
      for (const z of zs) {
        const [m] = await tx.select().from(fiscalMachines).where(eq(fiscalMachines.id, z.machineId)).limit(1);
        out.push({
          fechaFiscal: z.fecha, kind: "z_summary", rif: m?.serial ?? "", razonSocial: `Z-${z.zNumber}`,
          docNumber: `Z-${z.zNumber} [${z.rangeFrom}-${z.rangeTo}]`,
          baseImponible: z.ventasGravadas, ivaCausado: z.iva, total: z.total,
        });
      }
      return out.sort((a, b) => (a.fechaFiscal < b.fechaFiscal ? -1 : 1));
    }
    const docs = await tx
      .select()
      .from(salesDocuments)
      .where(periodId ? and(eq(salesDocuments.companyId, ctx.companyId), eq(salesDocuments.fiscalPeriodId, periodId)) : eq(salesDocuments.companyId, ctx.companyId));
    const out: SalesBookRow[] = [];
    for (const d of docs) {
      const [p] = await tx.select().from(parties).where(eq(parties.id, d.partyId)).limit(1);
      out.push({ fechaFiscal: d.fechaFiscal, kind: d.kind, rif: p?.rifOriginal ?? "", razonSocial: p?.razonSocial ?? "", docNumber: d.docNumber, baseImponible: d.baseImponible, ivaCausado: d.ivaCausado, total: d.total });
    }
    return out.sort((a, b) => (a.fechaFiscal < b.fechaFiscal ? -1 : 1));
  });
}
