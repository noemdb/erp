import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, auditEvents } from "@/db/schema";
import { hashPassword } from "@/modules/identity/password";
import {
  createUserWithMembership,
  setMembership,
  removeMembership,
  setUserStatus,
} from "./users";

const s = randomUUID().slice(0, 8);

async function setup() {
  const [admin] = await db
    .insert(users)
    .values({ email: `adm-${s}@test.local`, passwordHash: await hashPassword("0123456789"), name: "Adm", status: "active" })
    .returning({ id: users.id });
  const [c] = await db
    .insert(companies)
    .values({ rif: `J-43${s}-C`, rifOriginal: `J-43${s}-C`, razonSocial: "UC CA", condicionIva: "ordinario" })
    .returning({ id: companies.id });
  await db.insert(companyUser).values({ companyId: c!.id, userId: admin!.id, role: "admin", status: "active" });
  return { ctx: { companyId: c!.id, userId: admin!.id }, c: c!, admin: admin! };
}

async function cleanup(cId: string) {
  await db.delete(auditEvents).where(eq(auditEvents.companyId, cId));
  await db.delete(companyUser).where(eq(companyUser.companyId, cId));
  await db.delete(companies).where(eq(companies.id, cId));
  await db.delete(users).where(eq(users.email, `adm-${s}@test.local`));
  await db.delete(users).where(eq(users.email, `nuevo-${s}@test.local`));
}

describe("gestión de usuarios", () => {
  it("alta + duplicado + membresía + estado + auto-protección", async () => {
    const { ctx, c } = await setup();
    try {
      const email = `nuevo-${s}@test.local`;
      const pw = `pw-${s}-1234567890`; // solo test, aleatoria por corrida
      const created = await createUserWithMembership(ctx, {
        email, name: "Nuevo", password: pw, companyId: c.id, role: "contador",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) throw new Error("create");
      const uid = created.id;

      const dup = await createUserWithMembership(ctx, {
        email, name: "Otro", password: pw, companyId: c.id, role: "auditor",
      });
      expect(dup.ok).toBe(false);

      const ch = await setMembership(ctx, { userId: uid, companyId: c.id, role: "auditor" });
      expect(ch.ok).toBe(true);
      const [mem] = await db
        .select()
        .from(companyUser)
        .where(eq(companyUser.userId, uid))
        .limit(1);
      expect(mem!.role).toBe("auditor");

      const selfRevoke = await removeMembership(ctx, { userId: ctx.userId, companyId: c.id });
      expect(selfRevoke.ok).toBe(false);
      const rv = await removeMembership(ctx, { userId: uid, companyId: c.id });
      expect(rv.ok).toBe(true);

      // Re-otorga para probar estado
      expect((await setMembership(ctx, { userId: uid, companyId: c.id, role: "contador" })).ok).toBe(true);
      const selfSusp = await setUserStatus(ctx, { userId: ctx.userId, status: "suspended" });
      expect(selfSusp.ok).toBe(false);
      const susp = await setUserStatus(ctx, { userId: uid, status: "suspended" });
      expect(susp.ok).toBe(true);
      const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
      expect(u!.status).toBe("suspended");

      const aud = await db.select({ id: auditEvents.id }).from(auditEvents).where(eq(auditEvents.companyId, c.id));
      expect(aud.length).toBeGreaterThanOrEqual(4); // create + grant + revoke + grant + status
    } finally {
      await cleanup(c.id);
    }
  });
});
