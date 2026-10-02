import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, purchaseDocuments, purchaseDocumentLines,
  fiscalPeriods, auditEvents,
} from "@/db/schema";
import { createPurchaseDocument, getPurchaseBook } from "./service";
import { createSalesDocument } from "@/modules/sales/service";

const s = randomUUID().slice(0, 8);

/** 3.7: la fecha de registro jamás sustituye a la fecha fiscal. */
describe("cortes por período", () => {
  it("documento de agosto 'registrado tarde' pertenece a agosto; NC de agosto también", async () => {
    const [u] = await db.insert(users).values({ email: `cut-${s}@test.local`, passwordHash: "x", name: "C" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-50${s}-A`, rifOriginal: `J-50${s}-A`, razonSocial: "Cut CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const buy = await createPurchaseDocument(ctx, {
        partyRif: "J-13131313-1", partyRazon: "Prov", docNumber: "F-AGO", controlNumber: "C-AGO",
        fechaDocumento: "2026-09-10", fechaFiscal: "2026-08-15",
        baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "16",
      });
      expect(buy.ok).toBe(true);
      const periods = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      const ago = periods.find((p) => p.range === "[2026-08-01,2026-09-01)")!;
      const sep = periods.find((p) => p.range === "[2026-09-01,2026-10-01)");
      expect(ago).toBeTruthy();
      expect(sep).toBeUndefined(); // nada de septiembre creado por este documento
      expect((await getPurchaseBook(ctx, ago.id)).map((r) => r.docNumber)).toContain("F-AGO");

      const sale = await createSalesDocument(ctx, {
        partyRif: "J-14141414-1", partyRazon: "Cli", docNumber: "V-AGO", controlNumber: "VC-AGO",
        fechaDocumento: "2026-09-02", fechaFiscal: "2026-08-20",
        baseImponible: "200.00", ivaCausado: "32.00", total: "232.00", alicuota: "16",
      });
      expect(sale.ok).toBe(true);
      if (!sale.ok) throw new Error("setup");
      const nc = await createSalesDocument(ctx, {
        kind: "credit_note", partyRif: "J-14141414-1", partyRazon: "Cli", docNumber: "NC-AGO", controlNumber: "NCC-AGO",
        affectedDocumentId: sale.id, fechaDocumento: "2026-09-12", fechaFiscal: "2026-08-25",
        baseImponible: "50.00", ivaCausado: "8.00", total: "58.00", alicuota: "16",
      });
      expect(nc.ok).toBe(true);
    } finally {
      const { salesDocuments, salesDocumentLines } = await import("@/db/schema");
      const ss = await db.select().from(salesDocuments).where(eq(salesDocuments.companyId, c!.id));
      for (const d of ss) await db.delete(salesDocumentLines).where(eq(salesDocumentLines.documentId, d.id));
      await db.delete(salesDocuments).where(eq(salesDocuments.companyId, c!.id));
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
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
