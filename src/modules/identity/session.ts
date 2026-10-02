import { randomBytes, createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { env } from "@/lib/env";
import { sessions, users, companyUser } from "@/db/schema";

const TTL_MS = Number(process.env.SESSION_TTL_DAYS ?? 7) * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * `__Host-` exige Secure + Path=/ + sin Domain (los navegadores la rechazan
 * en http sin Secure, lo que rompía el login en dev). Secure siempre con ese
 * prefijo —localhost cuenta como origen confiable— o en producción.
 */
export function sessionCookieFlags() {
  const hostPrefixed = env.SESSION_COOKIE_NAME.startsWith("__Host-");
  return {
    httpOnly: true as const,
    secure: hostPrefixed || process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const h = await headers();
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TTL_MS),
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
  });
  (await cookies()).set(env.SESSION_COOKIE_NAME, token, sessionCookieFlags());
}

export async function destroySession(): Promise<void> {
  const token = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  (await cookies()).delete(env.SESSION_COOKIE_NAME);
}

export type SessionUser = { id: string; email: string; name: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function listMemberships(userId: string) {
  return db
    .select({ companyId: companyUser.companyId, role: companyUser.role })
    .from(companyUser)
    .where(eq(companyUser.userId, userId));
}
