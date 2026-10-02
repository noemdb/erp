"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { previewIva, issueIva, voidIva, deliverIva } from "./issue-iva";
import { previewIslr, issueIslr, voidIslr } from "./issue-islr";
import { configureAbonoCriterion } from "./g2-criterion";

async function emisor(companyId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const auth = await authorize(companyId, user.id, "withholdings.issue");
  return auth.ok ? { companyId, userId: user.id } : null;
}

export async function previewIvaAction(companyId: string, purchaseIds: string[], asOf: string) {
  const ctx = await emisor(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo quien puede emitir." } };
  return previewIva(ctx, purchaseIds, asOf);
}

export async function issueIvaAction(companyId: string, purchaseIds: string[], fechaEmision: string, opts?: { replacesId?: string }) {
  const ctx = await emisor(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo quien puede emitir." } };
  const res = await issueIva(ctx, purchaseIds, fechaEmision, opts);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones`);
  return res;
}

export async function voidIvaAction(companyId: string, id: string, reason: string) {
  const ctx = await emisor(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo quien puede emitir." } };
  const res = await voidIva(ctx, id, reason);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones/${id}`);
  return res;
}

export async function deliverIvaAction(companyId: string, id: string, fechaEntrega: string) {
  const ctx = await emisor(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo quien puede emitir." } };
  const res = await deliverIva(ctx, id, fechaEntrega);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones/${id}`);
  return res;
}

export async function renderIvaPdfAction(companyId: string, id: string) {
  const ctx = await emisor(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo quien puede emitir." } };
  const { renderIvaPdf } = await import("./render-job");
  const res = await renderIvaPdf(ctx, id);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones/${id}`);
  return res;
}

export async function previewIslrAction(companyId: string, input: Parameters<typeof previewIslr>[1]) {
  const ctx = await emisor(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo quien puede emitir." } };
  return previewIslr(ctx, input);
}

export async function issueIslrAction(companyId: string, input: Parameters<typeof issueIslr>[1], opts?: { replacesId?: string }) {
  const ctx = await emisor(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo quien puede emitir." } };
  const res = await issueIslr(ctx, input, opts);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones-islr`);
  return res;
}

export async function voidIslrAction(companyId: string, id: string, reason: string) {
  const ctx = await emisor(companyId);
  if (!ctx) return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo quien puede emitir." } };
  const res = await voidIslr(ctx, id, reason);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones-islr/${id}`);
  return res;
}

export async function configureAbonoCriterionAction(
  companyId: string,
  input: { criterion: "unset" | "payment_only" | "account_credit_or_payment"; reason: string },
) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const auth = await authorize(companyId, user.id, "rules.edit");
  if (!auth.ok || auth.role !== "contador") {
    return { ok: false as const, error: { code: "FORBIDDEN", message: "Solo el contador puede configurar el criterio G2." } };
  }
  const res = await configureAbonoCriterion({ companyId, userId: user.id }, input);
  if (res.ok) revalidatePath(`/c/${companyId}/retenciones-islr`);
  return res;
}
