import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, documentSeries } from "@/db/schema";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { reserveNumber, formatCertificate, periodKeyFor } from "./series";

const s = randomUUID().slice(0, 8);

describe("series sin huecos (ADR-005)", () => {
  it("secuencial, formato IVA 14 car., rollback no consume", async () => {
    const [u] = await db.insert(users).values({ email: `ser-${s}@test.local`, passwordHash: "x", name: "S" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-40${s}-A`, rifOriginal: `J-40${s}-A`, razonSocial: "Ser CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    const pk = "202609";
    try {
      const a = await withTenant(ctx, (tx) => reserveNumber(tx, c!.id, "iva_withholding", pk));
      const b = await withTenant(ctx, (tx) => reserveNumber(tx, c!.id, "iva_withholding", pk));
      expect([a, b]).toEqual([1, 2]);
      expect(formatCertificate("iva_withholding", pk, b)).toBe("20260900000002");
      expect(formatCertificate("iva_withholding", pk, b)).toHaveLength(14);
      expect(periodKeyFor("2026-09-20")).toBe("202609");

      // rollback no consume: falla dentro de la TX
      await expect(
        withTenant(ctx, async (tx) => {
          await reserveNumber(tx, c!.id, "iva_withholding", pk);
          throw new Error("fallo emisión");
        }),
      ).rejects.toThrow("fallo emisión");
      const d = await withTenant(ctx, (tx) => reserveNumber(tx, c!.id, "iva_withholding", pk));
      expect(d).toBe(3);

      // 20 reservas concurrentes: 4..23 sin duplicados
      const many = await Promise.all(Array.from({ length: 20 }, () => withTenant(ctx, (tx) => reserveNumber(tx, c!.id, "iva_withholding", pk))));
      expect(new Set(many).size).toBe(20);
      expect(Math.min(...many)).toBe(4);
      expect(Math.max(...many)).toBe(23);
    } finally {
      await db.delete(documentSeries).where(eq(documentSeries.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });

  it("4.3: 50 reservas paralelas sin duplicados ni huecos", async () => {
    const [u] = await db.insert(users).values({ email: `ser50-${s}@test.local`, passwordHash: "x", name: "S" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-52${s}-A`, rifOriginal: `J-52${s}-A`, razonSocial: "Ser50 CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const many = await Promise.all(Array.from({ length: 50 }, () => withTenant(ctx, (tx) => reserveNumber(tx, c!.id, "iva_withholding", "202610"))));
      expect(new Set(many).size).toBe(50);
      const sorted = [...many].sort((a, b) => a - b);
      expect(sorted[0]).toBe(1);
      expect(sorted[49]).toBe(50);
    } finally {
      await db.delete(documentSeries).where(eq(documentSeries.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
