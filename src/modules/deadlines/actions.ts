"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { upsertObligation, addHoliday } from "./service";

async function contador(companyId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, "periods.close");
  return auth.ok ? { companyId, userId: user.id } : null;
}

export async function upsertObligationAction(companyId: string, input: Parameters<typeof upsertObligation>[1]) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await upsertObligation(ctx, input);
  if (res.ok) revalidatePath(`/c/${companyId}/plazos`);
  return res;
}

export async function addHolidayAction(companyId: string, fecha: string, descripcion?: string) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await addHoliday(ctx, fecha, descripcion);
  if (res.ok) revalidatePath(`/c/${companyId}/plazos`);
  return res;
}
