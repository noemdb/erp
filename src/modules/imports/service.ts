import { createHash } from "node:crypto";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { sourceFiles, importBatches, importRows } from "@/db/schema";

export const UploadSchema = z.object({
  kind: z.enum(["purchases", "sales", "iva_withholdings", "islr_withholdings", "z_reports"]),
  sourceSystem: z.enum(["legacy_accounting", "fiscal_machine", "manual"]),
  originalName: z.string().min(1).max(255),
});

export type Ctx = { companyId: string; userId: string };
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;

/** Subida idempotente: mismo (company, sha256) retorna el lote existente sin duplicar. */
export async function uploadImport(ctx: Ctx, input: { kind: string; sourceSystem: string; originalName: string }, bytes: Buffer) {
  const parsed = UploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  if (bytes.length === 0) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Archivo vacío." } };
  if (bytes.length > MAX_BYTES)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: `Archivo excede ${process.env.MAX_UPLOAD_MB ?? 10} MB.` } };

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return withTenant(ctx, async (tx) => {
    const existing = await tx
      .select({ id: importBatches.id })
      .from(importBatches)
      .innerJoin(sourceFiles, eq(importBatches.sourceFileId, sourceFiles.id))
      .where(and(eq(sourceFiles.companyId, ctx.companyId), eq(sourceFiles.sha256, sha256)))
      .limit(1);
    if (existing[0]) return { ok: true as const, batchId: existing[0].id, deduped: true };

    const [sf] = await tx
      .insert(sourceFiles)
      .values({ companyId: ctx.companyId, sha256, originalName: parsed.data.originalName, sizeBytes: bytes.length, content: bytes, uploadedBy: ctx.userId })
      .returning({ id: sourceFiles.id });
    const [batch] = await tx
      .insert(importBatches)
      .values({ companyId: ctx.companyId, sourceFileId: sf!.id, kind: parsed.data.kind, sourceSystem: parsed.data.sourceSystem, status: "uploaded", createdBy: ctx.userId })
      .returning({ id: importBatches.id });
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "upload", entityType: "import_batch", entityId: batch!.id, after: { kind: parsed.data.kind, sha256 } }, `tx-import-${batch!.id}`);
    return { ok: true as const, batchId: batch!.id, deduped: false };
  });
}

export async function listBatches(ctx: Ctx) {
  return withTenant(ctx, (tx) =>
    tx.select().from(importBatches).where(eq(importBatches.companyId, ctx.companyId)).limit(200),
  );
}

export async function getBatch(ctx: Ctx, batchId: string) {
  return withTenant(ctx, async (tx) => {
    const [batch] = await tx.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
    if (!batch || batch.companyId !== ctx.companyId) return null;
    const rows = await tx.select().from(importRows).where(eq(importRows.batchId, batchId)).limit(500);
    return { batch, rows };
  });
}
