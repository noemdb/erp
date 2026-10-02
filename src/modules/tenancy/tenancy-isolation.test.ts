import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, branches } from "@/db/schema";
import { withTenant } from "./with-tenant";
import { authorize } from "./authorize";
import { hashPassword } from "@/modules/identity/password";

const stamp = randomUUID().slice(0, 8);

/**
 * F1-3 fuga entre tenants (SECURITY.md, obligatoria en CI).
 * Requiere DB real (Neon dev). Crea A/B aislados y limpia al final.
 * Nota: el rol owner bypassa RLS; el aislamiento activo es withTenant +
 * authorize a nivel app. RLS queda como defensa para el futuro rol app (ADR-015).
 */
describe("tenant isolation", () => {
  it("empresa B no ve ni opera sobre datos de empresa A", async () => {
    const emailA = `fuga-a-${stamp}@test.local`;
    const emailB = `fuga-b-${stamp}@test.local`;
    const pw = await hashPassword("cambio-temporal-123");
    const [uA] = await db
      .insert(users)
      .values({ email: emailA, passwordHash: pw, name: "Fuga A" })
      .returning({ id: users.id });
    const [uB] = await db
      .insert(users)
      .values({ email: emailB, passwordHash: pw, name: "Fuga B" })
      .returning({ id: users.id });
    const [cA] = await db
      .insert(companies)
      .values({
        rif: `J-30${stamp}-A`,
        rifOriginal: `J-30${stamp}-A`,
        razonSocial: "Fuga A CA",
        condicionIva: "ordinario",
      })
      .returning({ id: companies.id });
    const [cB] = await db
      .insert(companies)
      .values({
        rif: `J-30${stamp}-B`,
        rifOriginal: `J-30${stamp}-B`,
        razonSocial: "Fuga B CA",
        condicionIva: "ordinario",
      })
      .returning({ id: companies.id });

    try {
      await db.insert(companyUser).values([
        { companyId: cA!.id, userId: uA!.id, role: "admin" },
        { companyId: cB!.id, userId: uB!.id, role: "administrativo" },
      ]);

      // A crea sucursal en su contexto
      await withTenant({ companyId: cA!.id, userId: uA!.id }, async (tx) => {
        await tx.insert(branches).values({ companyId: cA!.id, codigo: "HQ", nombre: "Sede A" });
      });

      // B no ve la sucursal de A
      const seenByB = await withTenant({ companyId: cB!.id, userId: uB!.id }, async (tx) =>
        tx.select().from(branches).where(eq(branches.companyId, cB!.id)),
      );
      expect(seenByB).toHaveLength(0);

      // A sí la ve
      const seenByA = await withTenant({ companyId: cA!.id, userId: uA!.id }, async (tx) =>
        tx.select().from(branches).where(eq(branches.companyId, cA!.id)),
      );
      expect(seenByA).toHaveLength(1);

      // Autorización: admin gestiona, administrativo no cierra, y sin membresía cruzada
      expect((await authorize(cA!.id, uA!.id, "users.manage")).ok).toBe(true);
      expect((await authorize(cB!.id, uB!.id, "periods.close")).ok).toBe(false);
      expect((await authorize(cA!.id, uB!.id, "reports.read")).ok).toBe(false);
    } finally {
      await db.delete(branches).where(eq(branches.companyId, cA!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, cA!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, cB!.id));
      await db.delete(companies).where(eq(companies.id, cA!.id));
      await db.delete(companies).where(eq(companies.id, cB!.id));
      await db.delete(users).where(eq(users.id, uA!.id));
      await db.delete(users).where(eq(users.id, uB!.id));
    }
  });
});
