"use server";

import { getSessionUser, listMemberships } from "./session";
import { authorize } from "@/modules/tenancy/authorize";
import { issueResetLink, consumeResetLink } from "./recovery";

async function adminCtx() {
  const user = await getSessionUser();
  if (!user) return null;
  const mems = await listMemberships(user.id);
  for (const m of mems) {
    const auth = await authorize(m.companyId, user.id, "users.manage");
    if (auth.ok) return { companyId: m.companyId, userId: user.id };
  }
  return null;
}

export async function issueResetLinkAction(email: string) {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin." } };
  return issueResetLink(ctx, email);
}

export async function consumeResetLinkAction(token: string, password: string) {
  return consumeResetLink(token, password);
}
