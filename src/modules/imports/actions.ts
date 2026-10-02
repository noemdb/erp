"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateBatch } from "./validate";
import { confirmImport } from "./confirm";

function limited(key: string): boolean {
  return checkRateLimit(key, 10, 60_000);
}

export async function validateBatchAction(companyId: string, batchId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "imports.run");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso." } };
  if (!limited(`validate:${user.id}`)) return { ok: false as const, error: { code: "RATE_LIMITED", message: "Demasiadas validaciones." } };
  const res = await validateBatch({ companyId, userId: user.id }, batchId);
  if (res.ok) revalidatePath(`/c/${companyId}/importaciones/${batchId}`);
  return res;
}

export async function confirmImportAction(companyId: string, batchId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "imports.run");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso." } };
  if (!limited(`confirm:${user.id}`)) return { ok: false as const, error: { code: "RATE_LIMITED", message: "Demasiadas confirmaciones." } };
  const res = await confirmImport({ companyId, userId: user.id }, batchId);
  if (res.ok) revalidatePath(`/c/${companyId}/importaciones/${batchId}`);
  return res;
}
