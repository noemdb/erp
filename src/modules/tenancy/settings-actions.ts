"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "./authorize";
import { setSalesMode, assignMachineBranch } from "./settings";

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
