"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { upsertParty, setTaxProfile } from "./service";

async function can(companyId: string, action: "docs.create" | "reports.read") {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, action);
  return auth.ok ? user : null;
}

export async function upsertPartyAction(companyId: string, input: Parameters<typeof upsertParty>[1]) {
  const user = await can(companyId, "docs.create");
  if (!user) return { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso." } };
  const res = await upsertParty({ companyId, userId: user.id }, input);
  if (res.ok) revalidatePath(`/c/${companyId}/terceros`);
  return res;
}

export async function setTaxProfileAction(companyId: string, partyId: string, input: Parameters<typeof setTaxProfile>[2]) {
  const user = await can(companyId, "docs.create");
  if (!user) return { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso." } };
  const res = await setTaxProfile({ companyId, userId: user.id }, partyId, input);
  if (res.ok) revalidatePath(`/c/${companyId}/terceros/${partyId}`);
  return res;
}
