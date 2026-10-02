import Decimal from "decimal.js";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { resolvePeriod } from "@/modules/periods/resolve";
import { puedeAplicarNotaCredito } from "@/modules/tax-engine/compute";
import { record } from "@/modules/audit/record";
import { parties, purchaseDocuments, purchaseDocumentLines, auditEvents, sourceFiles, importBatches } from "@/db/schema";

const MoneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido (usa punto decimal)");

const GRAVADAS = ["general", "reduced", "additional"] as const;

const LineSchema = z.object({
  taxCategory: z.enum(["general", "reduced", "additional", "exempt", "no_subject", "no_credit"]),
  taxRate: z.string().regex(/^\d+(\.\d{1,6})?$/).nullable().default(null),
  base: MoneySchema,
  iva: MoneySchema,
  description: z.string().max(200).optional(),
});

export const CreatePurchaseSchema = z.object({
  partyRif: z.string().min(3).max(20),
  partyRazon: z.string().min(2).max(200),
  kind: z.enum(["invoice", "credit_note", "debit_note", "import", "exempt"]).default("invoice"),
  affectedDocumentId: z.string().uuid().optional(),
  docNumber: z.string().min(1).max(50),
  controlNumber: z.string().min(1).max(50),
  fechaDocumento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaRecepcion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFiscal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: MoneySchema,
  lines: z.array(LineSchema).min(1).max(50).optional(),
  // Compatibilidad F1 (una línea gravada general); se normaliza a lines.
  baseImponible: MoneySchema.optional(),
  ivaCausado: MoneySchema.optional(),
  alicuota: z.string().regex(/^\d+(\.\d{1,6})?$/).default("16"),
  source: z.object({ fileId: z.string().uuid(), rowNumber: z.number(), batchId: z.string().uuid() }).optional(),
});

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseSchema>;
export type ServiceError = { code: string; message: string };

export function normalizeRif(rif: string): string {
  return rif.toUpperCase().replace(/[\s-]/g, "");
}

/** Núcleo F1-4b: valida Inv.1 con Decimal (tolerancia 0.01 provisional, ADR-014), upserta tercero, crea doc+línea y audita. Motor real en F2. */
export async function createPurchaseDocument(
  ctx: { companyId: string; userId: string },
  raw: z.input<typeof CreatePurchaseSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: ServiceError }> {
  const parsed = CreatePurchaseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  const input = parsed.data;

  // Normaliza a líneas: compatibilidad con la entrada plana F1 (una línea general).
  const lines = input.lines ?? [{
    taxCategory: "general" as const,
    taxRate: input.alicuota,
    base: input.baseImponible ?? "0.00",
    iva: input.ivaCausado ?? "0.00",
  }];
  if (!input.lines && (input.baseImponible === undefined || input.ivaCausado === undefined))
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Indica líneas o base e IVA." } };

  const needsAffected = input.kind === "credit_note" || input.kind === "debit_note";
  if (needsAffected && !input.affectedDocumentId)
    return { ok: false, error: { code: "MISSING_AFFECTED_DOCUMENT", message: "NC/ND requieren documento afectado." } };

  // Invariante 1: base gravada + IVA + exento/no sujeto = total (tol. 0.01, ADR-014 provisional).
  let baseGrav = new Decimal(0);
  let ivaCalc = new Decimal(0);
  let exento = new Decimal(0);
  for (const [i, l] of lines.entries()) {
    const gravada = (GRAVADAS as readonly string[]).includes(l.taxCategory);
    if (gravada && l.taxRate === null)
      return { ok: false, error: { code: "VALIDATION_ERROR", message: `Línea ${i + 1} gravada requiere alícuota.` } };
    if (!gravada && !new Decimal(l.iva).isZero())
      return { ok: false, error: { code: "VALIDATION_ERROR", message: `Línea ${i + 1} ${l.taxCategory} no lleva IVA.` } };
    if (gravada) {
      baseGrav = baseGrav.plus(l.base);
      ivaCalc = ivaCalc.plus(l.iva);
    } else {
      exento = exento.plus(l.base);
    }
  }
  const diff = baseGrav.plus(ivaCalc).plus(exento).minus(input.total).abs();
  if (diff.gt("0.01"))
    return { ok: false, error: { code: "TOTAL_MISMATCH", message: `Base + IVA + exento debe igualar total (dif ${diff.toFixed(2)}).` } };
  const baseImponible = baseGrav.toFixed(2);
  const ivaCausado = ivaCalc.toFixed(2);

  try {
    return await withTenant(ctx, async (tx) => {
      const rif = normalizeRif(input.partyRif);
      let party = (
        await tx.select().from(parties).where(and(eq(parties.companyId, ctx.companyId), eq(parties.rif, rif))).limit(1)
      )[0];
      if (!party) {
        [party] = await tx
          .insert(parties)
          .values({ companyId: ctx.companyId, rif, rifOriginal: input.partyRif, razonSocial: input.partyRazon })
          .returning();
      } else if (party.status !== "active") {
        throw { code: "VALIDATION_ERROR", message: "Tercero inactivo." };
      }

      // Invariante 3: la NC no excede el saldo del documento afectado.
      if (input.kind === "credit_note" && input.affectedDocumentId) {
        const [aff] = await tx.select().from(purchaseDocuments).where(eq(purchaseDocuments.id, input.affectedDocumentId)).limit(1);
        if (!aff || aff.companyId !== ctx.companyId)
          throw { code: "VALIDATION_ERROR", message: "Documento afectado no existe." };
        const prev = await tx.select().from(purchaseDocuments).where(eq(purchaseDocuments.affectedDocumentId, input.affectedDocumentId));
        const usadas = prev.reduce((a, p) => a.plus(p.total), new Decimal(0));
        const saldo = new Decimal(aff.total).minus(usadas).toFixed(2);
        if (!puedeAplicarNotaCredito(saldo, input.total))
          throw { code: "CREDIT_NOTE_EXCEEDS_BALANCE", message: `NC excede saldo disponible (${saldo}).` };
      }

      const periodId = await resolvePeriod(tx, ctx.companyId, input.fechaFiscal);
      const [doc] = await tx
        .insert(purchaseDocuments)
        .values({
          companyId: ctx.companyId,
          fiscalPeriodId: periodId,
          kind: input.kind,
          partyId: party!.id,
          docNumber: input.docNumber,
          controlNumber: input.controlNumber,
          affectedDocumentId: input.affectedDocumentId ?? null,
          fechaDocumento: input.fechaDocumento,
          fechaRecepcion: input.fechaRecepcion ?? null,
          fechaFiscal: input.fechaFiscal,
          baseImponible,
          ivaCausado,
          total: input.total,
          status: "validated",
          sourceFileId: input.source?.fileId ?? null,
          sourceRowNumber: input.source?.rowNumber ?? null,
          importBatchId: input.source?.batchId ?? null,
        })
        .returning({ id: purchaseDocuments.id });
      await tx.insert(purchaseDocumentLines).values(
        lines.map((l, i) => ({
          companyId: ctx.companyId,
          documentId: doc!.id,
          lineNumber: i + 1,
          taxCategory: l.taxCategory,
          taxRate: l.taxRate,
          base: l.base,
          iva: l.iva,
          description: l.description ?? null,
        })),
      );
      await record(
        tx,
        { companyId: ctx.companyId, actorUserId: ctx.userId, action: "create", entityType: "purchase_document", entityId: doc!.id, after: input },
        `tx-purchase-${doc!.id}`,
      );
      return { ok: true, id: doc!.id };
    });
  } catch (e) {
    // Duplicado por índice único (sin importar driver: Turbopack no resuelve named exports CJS)
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23505")
      return { ok: false, error: { code: "DUPLICATE_DOCUMENT", message: "Documento duplicado (mismo proveedor, número y control)." } };
    if (typeof e === "object" && e !== null && "code" in e) return { ok: false, error: e as ServiceError };
    throw e;
  }
}

export type PurchaseBookRow = {
  id?: string;
  fechaFiscal: string;
  rif: string;
  razonSocial: string;
  docNumber: string;
  controlNumber: string;
  baseImponible: string;
  ivaCausado: string;
  total: string;
};

/** Libro de Compras provisional (derivado de documentos, F1). Filtra por período si se indica. */
export async function getPurchaseBook(ctx: { companyId: string; userId: string }, periodId?: string): Promise<PurchaseBookRow[]> {
  return withTenant(ctx, async (tx) => {
    const docs = await tx
      .select({
        id: purchaseDocuments.id,
        fechaFiscal: purchaseDocuments.fechaFiscal,
        docNumber: purchaseDocuments.docNumber,
        controlNumber: purchaseDocuments.controlNumber,
        baseImponible: purchaseDocuments.baseImponible,
        ivaCausado: purchaseDocuments.ivaCausado,
        total: purchaseDocuments.total,
        partyId: purchaseDocuments.partyId,
      })
      .from(purchaseDocuments)
      .where(
        periodId
          ? and(eq(purchaseDocuments.companyId, ctx.companyId), eq(purchaseDocuments.fiscalPeriodId, periodId))
          : eq(purchaseDocuments.companyId, ctx.companyId),
      );
    const out: PurchaseBookRow[] = [];
    for (const d of docs) {
      const [p] = await tx.select().from(parties).where(eq(parties.id, d.partyId)).limit(1);
      out.push({
        id: d.id,
        fechaFiscal: d.fechaFiscal,
        rif: p?.rifOriginal ?? "",
        razonSocial: p?.razonSocial ?? "",
        docNumber: d.docNumber,
        controlNumber: d.controlNumber,
        baseImponible: d.baseImponible,
        ivaCausado: d.ivaCausado,
        total: d.total,
      });
    }
    return out.sort((a, b) => (a.fechaFiscal < b.fechaFiscal ? -1 : 1));
  });
}

/** Documentos elegibles como afectada de NC/ND (misma empresa, con saldo informativo). */
export async function listPurchaseDocs(ctx: { companyId: string; userId: string }) {
  return withTenant(ctx, async (tx) => {
    const docs = await tx
      .select({
        id: purchaseDocuments.id,
        kind: purchaseDocuments.kind,
        docNumber: purchaseDocuments.docNumber,
        total: purchaseDocuments.total,
        partyId: purchaseDocuments.partyId,
      })
      .from(purchaseDocuments)
      .where(eq(purchaseDocuments.companyId, ctx.companyId))
      .limit(200);
    const out = [];
    for (const d of docs) {
      const [p] = await tx.select().from(parties).where(eq(parties.id, d.partyId)).limit(1);
      out.push({ ...d, rif: p?.rifOriginal ?? "", razonSocial: p?.razonSocial ?? "" });
    }
    return out;
  });
}

/** Drill-down 3.6: documento + líneas + origen (archivo/fila) + trazabilidad. */
export async function getPurchaseDetail(ctx: { companyId: string; userId: string }, id: string) {
  return withTenant(ctx, async (tx) => {
    const [d] = await tx.select().from(purchaseDocuments).where(eq(purchaseDocuments.id, id)).limit(1);
    if (!d || d.companyId !== ctx.companyId) return null;
    const [p] = await tx.select().from(parties).where(eq(parties.id, d.partyId)).limit(1);
    const lines = await tx.select().from(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, id));
    let origin = null;
    if (d.importBatchId) {
      const [b] = await tx.select().from(importBatches).where(eq(importBatches.id, d.importBatchId)).limit(1);
      const [f] = b ? await tx.select().from(sourceFiles).where(eq(sourceFiles.id, b.sourceFileId)).limit(1) : [null];
      origin = { batchId: d.importBatchId, fileName: f?.originalName ?? null, sha256: f?.sha256 ?? null, row: d.sourceRowNumber };
    }
    const trail = await tx.select().from(auditEvents).where(and(eq(auditEvents.companyId, ctx.companyId), eq(auditEvents.entityType, "purchase_document"), eq(auditEvents.entityId, id))).orderBy(auditEvents.occurredAt).limit(100);
    return { doc: d, party: p ?? null, lines, origin, trail };
  });
}
