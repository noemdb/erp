import { describe, expect, it } from "vitest";
import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companyUser, companies, sessions, passwordResetTokens, auditEvents } from "@/db/schema";
import { issueResetLink, consumeResetLink } from "./recovery";
import { hashPassword } from "./password";

const s = () => Math.random().toString(36).slice(2, 10);

describe("recuperación asistida", () => {
  it("emite, consume una vez, invalida sesiones; expirado se rechaza", async () => {
    const email = `rec-${s()}@test.local`;
    const [u] = await db.insert(users).values({ email, passwordHash: await hashPassword("inicial-12345"), name: "R" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-56${s()}-A`, rifOriginal: "x", razonSocial: "Rec CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "admin" });
    const admin = { companyId: c!.id, userId: u!.id };
    try {
      // inexistente no revela nada útil
      expect((await issueResetLink(admin, "nadie@test.local")).ok).toBe(false);
      const issued = await issueResetLink(admin, email);
      expect(issued.ok).toBe(true);
      if (!issued.ok) throw new Error("setup");
      const token = issued.link.split("/").pop()!;
      // crea sesión previa para verificar invalidación
      await db.insert(sessions).values({ userId: u!.id, tokenHash: createHash("sha256").update("previa").digest("hex"), expiresAt: new Date(Date.now() + 3600000) });

      expect((await consumeResetLink(token, "corta")).ok).toBe(false);
      expect((await consumeResetLink(token, "nueva-clave-123")).ok).toBe(true);
      const left = await db.select().from(sessions).where(eq(sessions.userId, u!.id));
      expect(left).toHaveLength(0);
      // reuso
      expect((await consumeResetLink(token, "otra-clave-123")).ok).toBe(false);

      // expirado
      const t2 = randomBytes(32).toString("hex");
      await db.insert(passwordResetTokens).values({ userId: u!.id, tokenHash: createHash("sha256").update(t2).digest("hex"), expiresAt: new Date(Date.now() - 1000), createdBy: u!.id });
      expect((await consumeResetLink(t2, "otra-clave-123")).ok).toBe(false);
    } finally {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, u!.id));
      await db.delete(sessions).where(eq(sessions.userId, u!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
