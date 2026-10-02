"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { createSalesDocument } from "./service";

export async function createSaleAction(companyId: string, input: Parameters<typeof createSalesDocument>[1]) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "docs.create");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso para registrar ventas." } };
  const res = await createSalesDocument({ companyId, userId: user.id }, input);
  if (res.ok) revalidatePath(`/c/${companyId}/ventas`);
  return res;
}
