"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { sendToReview, returnToOpen, closePeriod, reopenPeriod } from "./service";

type Ctx = { companyId: string; userId: string };

async function contador(companyId: string): Promise<Ctx | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, "periods.close");
  return auth.ok ? { companyId, userId: user.id } : null;
}

export async function sendToReviewAction(companyId: string, periodId: string) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await sendToReview(ctx, periodId);
  if (res.ok) revalidatePath(`/c/${companyId}/periodos`);
  return res;
}

export async function returnToOpenAction(companyId: string, periodId: string, reason: string) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await returnToOpen(ctx, periodId, reason);
  if (res.ok) revalidatePath(`/c/${companyId}/periodos`);
  return res;
}

export async function closePeriodAction(companyId: string, periodId: string) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await closePeriod(ctx, periodId);
  if (res.ok) revalidatePath(`/c/${companyId}/periodos`);
  return res;
}

export async function reopenPeriodAction(companyId: string, periodId: string, reason: string) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await reopenPeriod(ctx, periodId, reason);
  if (res.ok) revalidatePath(`/c/${companyId}/periodos`);
  return res;
}
