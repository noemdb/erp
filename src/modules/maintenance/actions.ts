"use server";

import { getSessionUser } from "@/modules/identity/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  isGlobalAdmin,
  cleanDatabase,
  previewClean,
  listCompaniesFlat,
  type CleanCounts,
  type CleanPreview,
} from "./repo";
import { cleanFsStorage, appendHistory, CleanInputSchema, PreviewInputSchema } from "./service";

export type CleanActionResult =
  | { ok: true; counts: CleanCounts; filesDeleted: number }
  | { ok: false; error: { code: string; message: string } };

export type PreviewActionResult =
  | { ok: true; preview: CleanPreview }
  | { ok: false; error: { code: string; message: string } };

async function adminId(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (!(await isGlobalAdmin(user.id))) return null;
  return user.id;
}

/** Vista previa (simulacro) de limpieza: conteos sin borrar. */
export async function previewCleanAction(input: { companyId?: string }): Promise<PreviewActionResult> {
  const id = await adminId();
  if (!id) return { ok: false, error: { code: "FORBIDDEN", message: "Solo administradores." } };
  const parsed = PreviewInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Empresa inválida." } };
  const preview = await previewClean(parsed.data.companyId);
  return { ok: true, preview };
}

/** Empresas para el selector (todas + una). Solo admin. */
export async function listCleanCompaniesAction(): Promise<
  | { ok: true; companies: { id: string; rif: string; razonSocial: string }[] }
  | { ok: false; error: { code: string; message: string } }
> {
  const id = await adminId();
  if (!id) return { ok: false, error: { code: "FORBIDDEN", message: "Solo administradores." } };
  return { ok: true, companies: await listCompaniesFlat() };
}

/** Limpieza (todas o una empresa, confirmación + motivo). Rate limit estricto. */
export async function cleanDatabaseAction(input: { confirm: string; reason: string; companyId?: string }): Promise<CleanActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  if (!(await isGlobalAdmin(user.id))) return { ok: false, error: { code: "FORBIDDEN", message: "Solo administradores." } };
  if (!checkRateLimit(`admin-clean:${user.id}`, 3, 60 * 60 * 1000))
    return { ok: false, error: { code: "RATE_LIMITED", message: "Límite de limpiezas alcanzado. Intenta en una hora." } };

  const parsed = CleanInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Confirmación inválida." } };

  const counts = await cleanDatabase(parsed.data.companyId);
  const storage = parsed.data.companyId ? { deleted: 0, skipped: true } : cleanFsStorage();
  // Sin PII: solo ids internos y conteos (el motivo puede nombrar terceros: no se loguea).
  logger.info(
    { actor: user.id, scope: parsed.data.companyId ?? "todas", counts, filesDeleted: storage.deleted, action: "admin.database.clean" },
    "limpieza de base de datos ejecutada",
  );
  appendHistory({
    ts: new Date().toISOString(),
    actor: user.id,
    action: "clean",
    counts: { companies: counts.companies, users: counts.users, preservedUsers: counts.preservedUsers },
  });
  return { ok: true, counts, filesDeleted: storage.deleted };
}
