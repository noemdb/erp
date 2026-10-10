import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { users, sessions, companies, companyUser } from "@/db/schema";
import { hashPassword } from "./password";
import { record } from "@/modules/audit/record";

export const ManageableRole = z.enum(["admin", "administrativo", "contador", "auditor"]);

const CreateUserSchema = z.object({
  email: z.string().email("Correo inválido"),
  name: z.string().trim().min(2, "Nombre muy corto").max(120),
  password: z.string().min(10, "Mínimo 10 caracteres").max(100),
  companyId: z.string().uuid("Empresa inválida"),
  role: ManageableRole,
});

/** Alta de usuario + primera membresía empresa·rol, en una TX con auditoría. */
export async function createUserWithMembership(
  ctx: { companyId: string; userId: string },
  raw: z.input<typeof CreateUserSchema>,
) {
  const parsed = CreateUserSchema.safeParse({ ...raw, email: raw.email.trim().toLowerCase() });
  if (!parsed.success)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  const [co] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, parsed.data.companyId)).limit(1);
  if (!co) return { ok: false as const, error: { code: "NOT_FOUND", message: "Empresa no existe." } };
  const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (dup) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Ese correo ya tiene cuenta." } };

  return db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({ email: parsed.data.email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), status: "active" })
      .returning({ id: users.id });
    await tx.insert(companyUser).values({ companyId: parsed.data.companyId, userId: u!.id, role: parsed.data.role, status: "active" });
    await record(
      tx,
      { companyId: parsed.data.companyId, actorUserId: ctx.userId, action: "user.create", entityType: "user", entityId: u!.id, after: { email: parsed.data.email, role: parsed.data.role } },
      `tx-user-create-${u!.id}`,
    );
    return { ok: true as const, id: u!.id };
  });
}

const MembershipSchema = z.object({
  userId: z.string().uuid("Usuario inválido"),
  companyId: z.string().uuid("Empresa inválida"),
  role: ManageableRole,
});

/** Otorga o cambia el rol de una membresía (upsert), con auditoría. */
export async function setMembership(
  ctx: { companyId: string; userId: string },
  raw: z.input<typeof MembershipSchema>,
) {
  const parsed = MembershipSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, parsed.data.userId)).limit(1);
  if (!u) return { ok: false as const, error: { code: "NOT_FOUND", message: "Usuario no existe." } };
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(companyUser)
      .where(and(eq(companyUser.companyId, parsed.data.companyId), eq(companyUser.userId, parsed.data.userId)))
      .limit(1);
    if (before) {
      await tx
        .update(companyUser)
        .set({ role: parsed.data.role })
        .where(and(eq(companyUser.companyId, parsed.data.companyId), eq(companyUser.userId, parsed.data.userId)));
    } else {
      await tx
        .insert(companyUser)
        .values({ companyId: parsed.data.companyId, userId: parsed.data.userId, role: parsed.data.role, status: "active" });
    }
    await record(
      tx,
      {
        companyId: parsed.data.companyId, actorUserId: ctx.userId, action: "membership.grant", entityType: "user", entityId: parsed.data.userId,
        before: before ? { role: before.role } : null, after: { role: parsed.data.role },
      },
      `tx-membership-${parsed.data.userId}-${parsed.data.companyId}`,
    );
    return { ok: true as const };
  });
}

const RevokeSchema = z.object({
  userId: z.string().uuid("Usuario inválido"),
  companyId: z.string().uuid("Empresa inválida"),
});

/** Quita el acceso a una empresa, con auditoría. Nunca a uno mismo. */
export async function removeMembership(
  ctx: { companyId: string; userId: string },
  raw: z.input<typeof RevokeSchema>,
) {
  const parsed = RevokeSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  if (parsed.data.userId === ctx.userId)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "No puedes quitarte tu propio acceso." } };
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(companyUser)
      .where(and(eq(companyUser.companyId, parsed.data.companyId), eq(companyUser.userId, parsed.data.userId)))
      .limit(1);
    if (!before) return { ok: false as const, error: { code: "NOT_FOUND", message: "Esa membresía no existe." } };
    await tx
      .delete(companyUser)
      .where(and(eq(companyUser.companyId, parsed.data.companyId), eq(companyUser.userId, parsed.data.userId)));
    await record(
      tx,
      {
        companyId: parsed.data.companyId, actorUserId: ctx.userId, action: "membership.revoke", entityType: "user", entityId: parsed.data.userId,
        before: { role: before.role },
      },
      `tx-membership-revoke-${parsed.data.userId}-${parsed.data.companyId}`,
    );
    return { ok: true as const };
  });
}

const StatusSchema = z.object({
  userId: z.string().uuid("Usuario inválido"),
  status: z.enum(["active", "suspended"]),
});
/** Suspende o reactiva el login (login rechaza no activos). Nunca a uno mismo. */
export async function setUserStatus(
  ctx: { companyId: string; userId: string },
  raw: z.input<typeof StatusSchema>,
) {
  const parsed = StatusSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  if (parsed.data.userId === ctx.userId)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "No puedes suspenderte a ti mismo." } };
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
    if (!before) return { ok: false as const, error: { code: "NOT_FOUND", message: "Usuario no existe." } };
    await tx.update(users).set({ status: parsed.data.status }).where(eq(users.id, parsed.data.userId));
    await record(
      tx,
      {
        companyId: ctx.companyId, actorUserId: ctx.userId, action: "user.status", entityType: "user", entityId: parsed.data.userId,
        before: { status: before.status }, after: { status: parsed.data.status },
      },
      `tx-user-status-${parsed.data.userId}`,
    );
    return { ok: true as const };
  });
}

const UpdateProfileSchema = z.object({
  userId: z.string().uuid("Usuario inválido"),
  name: z.string().trim().min(2, "Nombre muy corto").max(120).optional(),
  email: z.string().trim().toLowerCase().pipe(z.string().email("Correo inválido")).optional(),
  password: z.string().min(10, "Mínimo 10 caracteres").max(100).optional(),
}).refine((d) => d.name !== undefined || d.email !== undefined || d.password !== undefined, {
  message: "Sin cambios: indica nombre, correo o clave.",
});

/** Edita datos del usuario (nombre/correo/clave). Clave nueva revoca sesiones (como el reset) y nunca se audita el hash. */
export async function updateUserProfile(
  ctx: { companyId: string; userId: string },
  raw: z.input<typeof UpdateProfileSchema>,
) {
  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
    if (!before) return { ok: false as const, error: { code: "NOT_FOUND", message: "Usuario no existe." } };
    if (parsed.data.email && parsed.data.email !== before.email) {
      const [dup] = await tx.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
      if (dup) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Ese correo ya tiene cuenta." } };
    }
    const patch: { name?: string; email?: string; passwordHash?: string } = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.email !== undefined) patch.email = parsed.data.email;
    if (parsed.data.password !== undefined) {
      patch.passwordHash = await hashPassword(parsed.data.password);
      await tx.delete(sessions).where(eq(sessions.userId, parsed.data.userId));
    }
    await tx.update(users).set(patch).where(eq(users.id, parsed.data.userId));
    await record(
      tx,
      {
        companyId: ctx.companyId, actorUserId: ctx.userId, action: "user.update", entityType: "user", entityId: parsed.data.userId,
        before: { name: before.name, email: before.email }, after: { name: patch.name ?? before.name, email: patch.email ?? before.email, passwordChanged: parsed.data.password !== undefined },
      },
      `tx-user-update-${parsed.data.userId}`,
    );
    return { ok: true as const, passwordChanged: parsed.data.password !== undefined };
  });
}
