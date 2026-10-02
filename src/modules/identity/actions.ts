"use server";

import { redirect } from "next/navigation";
import { eq, and, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users, sessions } from "@/db/schema";
import { verifyPassword } from "./password";
import { createSession, destroySession, listMemberships } from "./session";
import { checkRateLimit } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export type LoginResult = { ok: true } | { ok: false; error: string };

/** Login con rate limit 5/min por correo (SECURITY.md). */
export async function login(form: { email: string; password: string }): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse({ email: form.email.trim().toLowerCase(), password: form.password });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  if (!checkRateLimit(`login:${parsed.data.email}`, 5, 60_000))
    return { ok: false, error: "Demasiados intentos. Espera un minuto." };

  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];
  if (!user || user.status !== "active") return { ok: false, error: "Credenciales inválidas." };
  if (!(await verifyPassword(user.passwordHash, parsed.data.password)))
    return { ok: false, error: "Credenciales inválidas." };

  await createSession(user.id);
  // Limpieza oportunista de sesiones vencidas del usuario.
  await db.delete(sessions).where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));
  const memberships = await listMemberships(user.id);
  redirect(memberships.length === 1 ? `/c/${memberships[0]!.companyId}` : "/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
