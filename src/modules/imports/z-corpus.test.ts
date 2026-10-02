import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, sourceFiles, importBatches, importRows,
  fiscalMachines, zReports, fiscalPeriods, auditEvents,
} from "@/db/schema";
import { uploadImport } from "./service";
import { validateBatch } from "./validate";
import { confirmImport } from "./confirm";

const s = randomUUID().slice(0, 8);

/** 2.0.2 ítem 2 fase A: corpus Z adversarial (continuidad, saltos, dups, máquinas, descuadre). */
describe("corpus Z adversarial", () => {
  it("3 válidas, 1 salto=advertencia, 2 rechazadas; confirma 4", async () => {
    const [u] = await db.insert(users).values({ email: `zc-${s}@test.local`, passwordHash: "x", name: "Z" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-58${s}-A`, rifOriginal: `J-58${s}-A`, razonSocial: "Zc CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const bytes = readFileSync(join(__dirname, "..", "..", "..", "fixtures", "csv-corpus", "z-adversarial.csv"));
      const up = await uploadImport(ctx, { kind: "z_reports", sourceSystem: "fiscal_machine", originalName: "z.csv" }, bytes);
      expect(up.ok).toBe(true);
      if (!up.ok) throw new Error("setup");
      const v = await validateBatch(ctx, up.batchId);
      expect(v.ok).toBe(true);
      if (!v.ok) throw new Error("setup validate");
      expect(v).toMatchObject({ total: 6, valid: 3, warning: 1, rejected: 2 });
      const cf = await confirmImport(ctx, up.batchId);
      expect(cf.ok && cf.created).toBe(4);
      expect((await db.select().from(fiscalMachines).where(eq(fiscalMachines.companyId, c!.id)))).toHaveLength(2);
    } finally {
      await db.delete(zReports).where(eq(zReports.companyId, c!.id));
      await db.delete(fiscalMachines).where(eq(fiscalMachines.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      const bs = await db.select().from(importBatches).where(eq(importBatches.companyId, c!.id));
      for (const b of bs) await db.delete(importRows).where(eq(importRows.batchId, b.id));
      await db.delete(importBatches).where(eq(importBatches.companyId, c!.id));
      await db.delete(sourceFiles).where(eq(sourceFiles.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
