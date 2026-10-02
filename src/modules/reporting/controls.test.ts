import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, purchaseDocuments, purchaseDocumentLines,
  fiscalPeriods, auditEvents,
} from "@/db/schema";
import { findDuplicates, getAutoControls } from "./summary";

const s = randomUUID().slice(0, 8);

describe("controles F8", () => {
  it("findDuplicates es puro y exacto", () => {
    expect(findDuplicates([{ key: "a", id: "1" }, { key: "b", id: "2" }])).toEqual([]);
    const d = findDuplicates([{ key: "a", id: "1" }, { key: "a", id: "2" }]);
    expect(d).toHaveLength(1);
    expect(d[0]!.ids).toEqual(["1", "2"]);
  });

  it("detecta base/IVA descuadrados y período incorrecto", async () => {
    const [u] = await db.insert(users).values({ email: `f8-${s}@test.local`, passwordHash: "x", name: "F" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-45${s}-A`, rifOriginal: `J-45${s}-A`, razonSocial: "F8 CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const [p] = await db.insert(parties).values({ companyId: c!.id, rif: "J111111111", rifOriginal: "J-11111111-1", razonSocial: "P" }).returning();
      const [per] = await db.insert(fiscalPeriods).values({ companyId: c!.id, kind: "monthly", range: "[2026-09-01,2026-10-01)", status: "open" }).returning();
      // Documento inconsistente insertado directo (bypass servicio, como lo haría un bug o legacy):
      // fecha de agosto en período de septiembre + líneas que no cuadran.
      const [d] = await db.insert(purchaseDocuments).values({
        companyId: c!.id, fiscalPeriodId: per!.id, partyId: p!.id, docNumber: "FX-1", controlNumber: "CX-1",
        fechaDocumento: "2026-08-20", fechaFiscal: "2026-08-20",
        baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", status: "validated",
      }).returning();
      await db.insert(purchaseDocumentLines).values({ companyId: c!.id, documentId: d!.id, lineNumber: 1, taxCategory: "general", taxRate: "0.16", base: "90.00", iva: "10.00" });

      const res = await getAutoControls(ctx, per!.id);
      expect(res.ok).toBe(false);
      const byKey = Object.fromEntries(res.items.map((i) => [i.key, i]));
      expect(byKey.periodos!.hallazgos).toContain("FX-1");
      expect(byKey.base!.hallazgos).toContain("FX-1");
      expect(byKey.iva!.hallazgos).toContain("FX-1");
      expect(byKey.duplicados!.hallazgos).toEqual([]);
    } finally {
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const dd of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, dd.id));
      await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
