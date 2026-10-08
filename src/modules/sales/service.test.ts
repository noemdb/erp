import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, parties, salesDocuments, salesDocumentLines, fiscalPeriods, auditEvents } from "@/db/schema";
import { createSalesDocument } from "./service";

const s = randomUUID().slice(0, 8);

describe("ventas", () => {
  it("crea factura, NC contra afectada, rechaza NC que excede", async () => {
    const [u] = await db.insert(users).values({ email: `sale-${s}@test.local`, passwordHash: "x", name: "S" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-35${s}-A`, rifOriginal: `J-35${s}-A`, razonSocial: "Sale CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    const base = { kind: "invoice" as const, partyRif: "J-22222222-2", partyRazon: "Cliente Y", docNumber: "V-1", controlNumber: "VC-1", fechaDocumento: "2026-09-06", fechaFiscal: "2026-09-06", baseImponible: "200.00", ivaCausado: "32.00", total: "232.00", alicuota: "0.16" };
    try {
      const ok = await createSalesDocument(ctx, base);
      expect(ok.ok).toBe(true);
      if (!ok.ok) throw new Error("setup");

      const noAff = await createSalesDocument(ctx, { ...base, kind: "credit_note", docNumber: "NC-0", controlNumber: "NCC-0", total: "10.00", baseImponible: "10.00", ivaCausado: "0.00" });
      expect(noAff.ok).toBe(false);
      if (!noAff.ok) expect(noAff.error.code).toBe("MISSING_AFFECTED_DOCUMENT");

      const nc = await createSalesDocument(ctx, { ...base, kind: "credit_note", docNumber: "NC-1", controlNumber: "NCC-1", affectedDocumentId: ok.id, total: "100.00", baseImponible: "100.00", ivaCausado: "0.00" });
      expect(nc.ok).toBe(true);

      const big = await createSalesDocument(ctx, { ...base, kind: "credit_note", docNumber: "NC-2", controlNumber: "NCC-2", affectedDocumentId: ok.id, total: "200.00", baseImponible: "200.00", ivaCausado: "0.00" });
      expect(big.ok).toBe(false);
      if (!big.ok) expect(big.error.code).toBe("CREDIT_NOTE_EXCEEDS_BALANCE");
    } finally {
      const docs = await db.select().from(salesDocuments).where(eq(salesDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(salesDocumentLines).where(eq(salesDocumentLines.documentId, d.id));
      await db.delete(salesDocuments).where(eq(salesDocuments.companyId, c!.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
