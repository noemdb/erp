"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { createSettlementEvent, allocateSettlementEvent } from "./service";

async function ctxOf(companyId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, "docs.create");
  return auth.ok ? { companyId, userId: user.id } : null;
}

export async function createSettlementEventAction(companyId: string, input: Parameters<typeof createSettlementEvent>[1]) {
  const ctx = await ctxOf(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso." } };
  const res = await createSettlementEvent(ctx, input);
  if (res.ok) revalidatePath(`/c/${companyId}/pagos`);
  return res;
}

export async function allocateSettlementEventAction(companyId: string, eventId: string, purchaseDocumentId: string, amount: string) {
  const ctx = await ctxOf(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso." } };
  const res = await allocateSettlementEvent(ctx, eventId, purchaseDocumentId, amount);
  if (res.ok) revalidatePath(`/c/${companyId}/pagos/${eventId}`);
  return res;
}
