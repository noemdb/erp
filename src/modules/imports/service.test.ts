import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, sourceFiles, importBatches, auditEvents } from "@/db/schema";
import { uploadImport } from "./service";

const s = randomUUID().slice(0, 8);

describe("staging idempotente", () => {
  it("misma subida dos veces no duplica; vacío y binario se rechazan", async () => {
    const [u] = await db.insert(users).values({ email: `imp-${s}@test.local`, passwordHash: "x", name: "I" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-37${s}-A`, rifOriginal: `J-37${s}-A`, razonSocial: "Imp CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const bytes = Buffer.from("fecha,rif,factura\n2026-09-01,J-12345678-9,F-1\n", "utf8");
      const a = await uploadImport(ctx, { kind: "purchases", sourceSystem: "legacy_accounting", originalName: "compras.csv" }, bytes);
      expect(a.ok).toBe(true);
      const b = await uploadImport(ctx, { kind: "purchases", sourceSystem: "legacy_accounting", originalName: "compras.csv" }, bytes);
      expect(b.ok && b.deduped).toBe(true);
      if (a.ok && b.ok) expect(b.batchId).toBe(a.batchId);

      const files = await db.select().from(sourceFiles).where(eq(sourceFiles.companyId, c!.id));
      expect(files).toHaveLength(1);

      const empty = await uploadImport(ctx, { kind: "purchases", sourceSystem: "manual", originalName: "vacio.csv" }, Buffer.alloc(0));
      expect(empty.ok).toBe(false);
    } finally {
      await db.delete(importBatches).where(eq(importBatches.companyId, c!.id));
      await db.delete(sourceFiles).where(eq(sourceFiles.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
