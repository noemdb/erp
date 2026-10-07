"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import {
  createDecision, updateDraft, submitDecision, returnDecision, approveDecision,
  signDecision, rejectDecision, supersedeDecision,
} from "./service";
import { linkDecisionToRule, unlinkDecisionFromRule } from "./links";

/** Prepara: administrativo o contador (docs.create). */
async function preparador(companyId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, "docs.create");
  return auth.ok ? { companyId, userId: user.id } : null;
}

/** Aprueba/firma: solo contador (rules.edit). */
async function contador(companyId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, "rules.edit");
  return auth.ok ? { companyId, userId: user.id } : null;
}

const FORBIDDEN = { ok: false as const, error: { code: "FORBIDDEN", message: "Sin permiso." } };

export async function createDecisionAction(companyId: string, input: Parameters<typeof createDecision>[1]) {
  const ctx = await preparador(companyId);
  if (!ctx) return FORBIDDEN;
  const res = await createDecision(ctx, input);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones`);
  return res;
}

export async function updateDraftAction(companyId: string, id: string, input: Parameters<typeof updateDraft>[2]) {
  const ctx = await preparador(companyId);
  if (!ctx) return FORBIDDEN;
  const res = await updateDraft(ctx, id, input);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones/${id}`);
  return res;
}

export async function submitDecisionAction(companyId: string, id: string) {
  const ctx = await preparador(companyId);
  if (!ctx) return FORBIDDEN;
  const res = await submitDecision(ctx, id);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones/${id}`);
  return res;
}

export async function returnDecisionAction(companyId: string, id: string, input: { motivo: string }) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await returnDecision(ctx, id, input);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones/${id}`);
  return res;
}

export async function approveDecisionAction(companyId: string, id: string) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await approveDecision(ctx, id);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones/${id}`);
  return res;
}

export async function signDecisionAction(companyId: string, id: string, input: Parameters<typeof signDecision>[2]) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await signDecision(ctx, id, input);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones/${id}`);
  return res;
}

export async function rejectDecisionAction(companyId: string, id: string, input: { motivo: string }) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await rejectDecision(ctx, id, input);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones/${id}`);
  return res;
}

export async function supersedeDecisionAction(companyId: string, id: string, input: { motivo: string }) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await supersedeDecision(ctx, id, input);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones/${id}`);
  return res;
}

export async function linkDecisionAction(companyId: string, decisionId: string, input: Parameters<typeof linkDecisionToRule>[2]) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  const res = await linkDecisionToRule(ctx, decisionId, input);
  if (res.ok) revalidatePath(`/c/${companyId}/decisiones/${decisionId}`);
  return res;
}

export async function unlinkDecisionAction(companyId: string, linkId: string, input: { motivo: string }) {
  const ctx = await contador(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo contador." } };
  return unlinkDecisionFromRule(ctx, linkId, input);
}
