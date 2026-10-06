"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { createPurchaseDocument, voidPurchaseDocument, type ServiceError } from "./service";
import type { z } from "zod";
import type { CreatePurchaseSchema } from "./service";

export async function createPurchaseAction(
  companyId: string,
  input: z.input<typeof CreatePurchaseSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: ServiceError } | { ok: false; error: { code: string; message: string } }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "docs.create");
  if (!auth.ok) return { ok: false, error: { code: "FORBIDDEN", message: "Sin permiso para registrar compras." } };
  const res = await createPurchaseDocument({ companyId, userId: user.id }, input);
  if (res.ok) revalidatePath(`/c/${companyId}/compras`);
  return res;
}

export async function voidPurchaseAction(
  companyId: string,
  id: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: { code: string; message: string } }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "docs.create");
  if (!auth.ok) return { ok: false, error: { code: "FORBIDDEN", message: "Sin permiso para anular compras." } };
  const res = await voidPurchaseDocument({ companyId, userId: user.id }, id, reason);
  if (res.ok) {
    revalidatePath(`/c/${companyId}/compras/${id}`);
    revalidatePath(`/c/${companyId}/compras`);
  }
  return res;
}
