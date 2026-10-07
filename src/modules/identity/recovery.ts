import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { users, sessions, passwordResetTokens, companyUser, companies } from "@/db/schema";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { hashPassword } from "./password";

const TTL_MIN = Number(process.env.RECOVERY_TTL_MIN ?? 60);

function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}

/** Admin genera enlace de un solo uso (canal externo). Respuesta uniforme. */
export async function issueResetLink(adminCtx: { companyId: string; userId: string }, targetEmail: string) {
  const email = targetEmail.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Correo inválido." } };
  const [target] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // No revelar existencia: el enlace solo se muestra si el usuario existe (flujo asistido, el admin ya lo ve).
  if (!target) return { ok: false as const, error: { code: "NOT_FOUND", message: "Usuario no existe." } };
  const token = randomBytes(32).toString("hex");
  const [row] = await db
    .insert(passwordResetTokens)
    .values({ userId: target.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TTL_MIN * 60000), createdBy: adminCtx.userId })
    .returning({ id: passwordResetTokens.id });
  await withTenant(adminCtx, (tx) =>
    record(tx, { companyId: adminCtx.companyId, actorUserId: adminCtx.userId, action: "reset_issue", entityType: "user", entityId: target.id, after: { tokenId: row!.id } }, `tx-rst-${row!.id}`).then(() => undefined) as Promise<void>,
  );
  return { ok: true as const, link: `/recuperar/${token}`, userId: target.id };
}

/** Consume el enlace: valida, invalida sesiones+tokens, fija contraseña. */
export async function consumeResetLink(token: string, newPassword: string) {
  const pw = z.string().min(10).max(100).safeParse(newPassword);
  if (!pw.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Mínimo 10 caracteres." } };
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hashToken(token))).limit(1);
  if (!row || row.usedAt || row.expiresAt < new Date()) return { ok: false as const, error: { code: "FORBIDDEN", message: "Enlace inválido o vencido." } };
  // Comparación constante + chequeo de un solo uso dentro de TX.
  if (!timingSafeEqual(Buffer.from(row.tokenHash), Buffer.from(hashToken(token))))
    return { ok: false as const, error: { code: "FORBIDDEN", message: "Enlace inválido." } };
  try {
    await db.transaction(async (tx) => {
      const fresh = await tx.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
      if (!fresh[0]) throw { code: "FORBIDDEN", message: "Enlace ya usado o vencido." };
      await tx.update(users).set({ passwordHash: await hashPassword(pw.data), updatedAt: new Date() }).where(eq(users.id, row.userId));
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
      await tx.delete(sessions).where(eq(sessions.userId, row.userId));
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.userId, row.userId));
    });
  } catch {
    return { ok: false as const, error: { code: "FORBIDDEN", message: "Enlace ya usado o vencido." } };
  }
  return { ok: true as const };
}

export async function listUsersForAdmin() {
  const us = await db.select().from(users).limit(200);
  const mems = await db.select().from(companyUser).limit(1000);
  const cos = await db.select().from(companies).limit(200);
  const nameOf = new Map(cos.map((c) => [c.id, c.razonSocial]));
  return us.map((u) => ({
    ...u,
    passwordHash: undefined,
    companies: mems
      .filter((m) => m.userId === u.id)
      .map((m) => ({ companyId: m.companyId, razonSocial: nameOf.get(m.companyId) ?? "—", role: m.role })),
  }));
}
