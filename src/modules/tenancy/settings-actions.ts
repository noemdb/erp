"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "./authorize";
import { setSalesMode, assignMachineBranch, updateFiscalProfile } from "./settings";

async function contador(companyId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, "periods.close");
  return auth.ok ? { companyId, userId: user.id } : null;
}

export async function setSalesModeAction(companyId: string, mode: string) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await setSalesMode(ctx, mode);
  if (res.ok) revalidatePath(`/c/${companyId}/configuracion`);
  return res;
}

export async function assignMachineBranchAction(companyId: string, machineId: string, branchId: string | null) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await assignMachineBranch(ctx, machineId, branchId);
  if (res.ok) revalidatePath(`/c/${companyId}/ventas/z`);
  return res;
}

/** Perfil fiscal de la empresa. Solo admin (API.md updateCompanyFiscalProfile). */
export async function updateFiscalProfileAction(companyId: string, input: Parameters<typeof updateFiscalProfile>[1]) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "companies.manage");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo el administrador." } };
  const res = await updateFiscalProfile({ companyId, userId: user.id }, input);
  if (res.ok) revalidatePath(`/c/${companyId}/configuracion`);
  return res;
}
