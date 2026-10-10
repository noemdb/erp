"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, listMemberships } from "./session";
import { authorize } from "@/modules/tenancy/authorize";
import { createUserWithMembership, setMembership, removeMembership, setUserStatus, updateUserProfile } from "./users";

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

export async function createUserAction(input: Parameters<typeof createUserWithMembership>[1]) {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin." } };
  // El alta solo puede dar acceso donde el admin gestiona: la empresa destino debe ser una que él administra.
  const auth = await authorize(input.companyId, ctx.userId, "users.manage");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin de esa empresa." } };
  const res = await createUserWithMembership(ctx, input);
  if (res.ok) revalidatePath("/usuarios");
  return res;
}

export async function setMembershipAction(input: Parameters<typeof setMembership>[1]) {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin." } };
  const auth = await authorize(input.companyId, ctx.userId, "users.manage");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin de esa empresa." } };
  const res = await setMembership(ctx, input);
  if (res.ok) revalidatePath("/usuarios");
  return res;
}

export async function removeMembershipAction(input: Parameters<typeof removeMembership>[1]) {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin." } };
  const auth = await authorize(input.companyId, ctx.userId, "users.manage");
  if (!auth.ok) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin de esa empresa." } };
  const res = await removeMembership(ctx, input);
  if (res.ok) revalidatePath("/usuarios");
  return res;
}

export async function setUserStatusAction(input: Parameters<typeof setUserStatus>[1]) {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin." } };
  const res = await setUserStatus(ctx, input);
  if (res.ok) revalidatePath("/usuarios");
  return res;
}

export async function updateUserAction(input: Parameters<typeof updateUserProfile>[1]) {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo admin." } };
  const res = await updateUserProfile(ctx, input);
  if (res.ok) revalidatePath("/usuarios");
  return res;
}
