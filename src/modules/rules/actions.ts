"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { createDraft, submitRule, approveRule, activateRule, createConcept } from "./service";

/** Catálogos: solo contador (ADR-020 bloquea repartir roles hasta matriz de usuarios). */
async function contador(companyId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, "rules.edit");
  return auth.ok ? { companyId, userId: user.id } : null;
}

export async function createDraftAction(companyId: string, input: Parameters<typeof createDraft>[1]) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await createDraft(ctx, input);
  if (res.ok) revalidatePath(`/c/${companyId}/reglas`);
  return res;
}

async function step(companyId: string, id: string, fn: (ctx: { companyId: string; userId: string }, id: string) => Promise<{ ok: boolean; error?: unknown }>) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await fn(ctx, id);
  if (res.ok) revalidatePath(`/c/${companyId}/reglas/${id}`);
  return res;
}

export async function submitRuleAction(c: string, id: string) {
  return step(c, id, submitRule);
}
export async function approveRuleAction(c: string, id: string) {
  return step(c, id, approveRule);
}
export async function activateRuleAction(c: string, id: string) {
  return step(c, id, activateRule);
}

export async function createConceptAction(companyId: string, input: { codigo: string; nombre: string }) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  return createConcept(ctx, input);
}
