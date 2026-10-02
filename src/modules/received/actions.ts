"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { registerReceived, conciliateReceived, applyReceived, voidReceived } from "./service";

async function ctxOf(companyId: string, action: "docs.create" | "periods.close") {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, action);
  return auth.ok ? { companyId, userId: user.id } : null;
}

export async function registerReceivedAction(companyId: string, input: Parameters<typeof registerReceived>[1]) {
  const ctx = await ctxOf(companyId, "docs.create");
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso." } };
  const res = await registerReceived(ctx, input);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones-recibidas`);
  return res;
}

export async function conciliateReceivedAction(companyId: string, id: string, accept: boolean, reason?: string) {
  const ctx = await ctxOf(companyId, "periods.close");
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await conciliateReceived(ctx, id, accept, reason);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones-recibidas/${id}`);
  return res;
}

export async function applyReceivedAction(companyId: string, id: string, periodId: string) {
  const ctx = await ctxOf(companyId, "periods.close");
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await applyReceived(ctx, id, periodId);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones-recibidas/${id}`);
  return res;
}

export async function voidReceivedAction(companyId: string, id: string, reason: string) {
  const ctx = await ctxOf(companyId, "periods.close");
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await voidReceived(ctx, id, reason);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones-recibidas/${id}`);
  return res;
}
