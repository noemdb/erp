"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { saveSummaryVersion } from "./summary";
import { freezeClosingPackage } from "./closing-package";

export async function saveSummaryVersionAction(companyId: string, periodId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "periods.close");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await saveSummaryVersion({ companyId, userId: user.id }, periodId);
  revalidatePath(`/c/${companyId}/reportes/resumen-iva/${periodId}`);
  return res;
}

/** Congela el manifiesto del paquete de cierre (B3, R5). Solo contador. */
export async function freezeClosingPackageAction(companyId: string, periodId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "periods.close");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await freezeClosingPackage({ companyId, userId: user.id }, periodId);
  revalidatePath(`/c/${companyId}/periodos/${periodId}`);
  return res;
}
