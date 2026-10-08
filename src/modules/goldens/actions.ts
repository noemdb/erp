"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { signGoldenCase, type SignInput } from "./sign";

/** Firma un dorado (Opción 1): solo rol `contador`. RBAC en el permiso, no en la UI. */
export async function signGoldenCaseAction(companyId: string, id: string, input: SignInput) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: { code: "FORBIDDEN", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "goldens.sign");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo el contador firma dorados." } };
  const res = signGoldenCase(id, user.id, input);
  if (res.ok) revalidatePath(`/c/${companyId}/dorados/${id}`);
  return res;
}
