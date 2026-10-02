import { createHash } from "node:crypto";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { attachments } from "@/db/schema";
import { putBlob, signDownload, verifyDownload } from "@/lib/storage";

export type Ctx = { companyId: string; userId: string };

const ALLOWED: Record<string, string[]> = {
  "application/pdf": ["%PDF"],
  "image/png": ["\x89PNG"],
  "image/jpeg": ["\xFF\xD8\xFF"],
  "text/csv": [],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["PK\x03\x04"],
};
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;

/** Tipo por contenido (magic bytes), no por extensión. skipContentCheck solo en tests. */
export function detectMime(bytes: Buffer, claimed: string, skipContentCheck = false): string | null {
  const head = bytes.subarray(0, 4).toString("binary");
  if (claimed === "text/csv") {
    if (!skipContentCheck && bytes.includes(0)) return null;
    return "text/csv";
  }
  for (const [mime, magics] of Object.entries(ALLOWED)) {
    if (mime === "text/csv") continue;
    if (magics.some((m) => head.startsWith(m))) return mime;
  }
  return null;
}

export const UploadMeta = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid(),
  originalName: z.string().min(1).max(255),
  claimedMime: z.string().max(100),
});

export async function uploadAttachment(ctx: Ctx, meta: z.input<typeof UploadMeta>, bytes: Buffer) {
  const parsed = UploadMeta.safeParse(meta);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  if (bytes.length === 0 || bytes.length > MAX_BYTES)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Tamaño inválido." } };
  const mime = detectMime(bytes, parsed.data.claimedMime);
  if (!mime) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Tipo de archivo no permitido o contenido inválido." } };
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  // Deduplicación por contenido dentro de la empresa.
  const existing = await withTenant(ctx, (tx) =>
    tx.select().from(attachments).where(and(eq(attachments.companyId, ctx.companyId), eq(attachments.sha256, sha256))).limit(1),
  );
  try {
    const { key } = await putBlob(sha256, bytes, mime);
    return withTenant(ctx, async (tx) => {
      if (existing[0]) return { ok: true as const, id: existing[0].id, deduped: true };
      const [row] = await tx
        .insert(attachments)
        .values({
          companyId: ctx.companyId, entityType: parsed.data.entityType, entityId: parsed.data.entityId,
          sha256, sizeBytes: bytes.length, mime, originalName: parsed.data.originalName.replace(/[^\w.\- ]/g, "_"),
          storageKey: key, createdBy: ctx.userId,
        })
        .returning({ id: attachments.id });
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "upload", entityType: "attachment", entityId: row!.id, after: { mime, bytes: bytes.length } }, `tx-att-${row!.id}`);
      return { ok: true as const, id: row!.id, deduped: false };
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e) return { ok: false as const, error: e as { code: string; message: string } };
    throw e;
  }
}

export async function getAttachment(ctx: Ctx, id: string) {
  return withTenant(ctx, async (tx) => {
    const [a] = await tx.select().from(attachments).where(eq(attachments.id, id)).limit(1);
    if (!a || a.companyId !== ctx.companyId || a.status !== "active") return null;
    return a;
  });
}

/** Anular (documentos emitidos/cerrados: marca, no borra). */
export async function voidAttachment(ctx: Ctx, id: string, reason: string) {
  if (reason.trim().length < 3) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Motivo requerido." } };
  return withTenant(ctx, async (tx) => {
    const [a] = await tx.select().from(attachments).where(eq(attachments.id, id)).limit(1);
    if (!a || a.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "No existe." } };
    await tx.update(attachments).set({ status: "voided", voidReason: reason }).where(eq(attachments.id, id));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "void", entityType: "attachment", entityId: id, reason }, `tx-att-void-${id}`);
    return { ok: true as const };
  });
}

export function downloadTicket(ctx: Ctx, attachmentId: string, ttlSeconds = 900): { url: string; exp: number } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = signDownload(attachmentId, ctx.companyId, ctx.userId, exp);
  return { url: `/api/companies/${ctx.companyId}/archivos/${attachmentId}?exp=${exp}&sig=${sig}&uid=${ctx.userId}`, exp };
}

export function checkTicket(sig: string, attachmentId: string, companyId: string, userId: string, exp: number): boolean {
  return verifyDownload(sig, attachmentId, companyId, userId, exp);
}
