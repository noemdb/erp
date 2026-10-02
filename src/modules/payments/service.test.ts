import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, parties, settlementEvents, settlementAllocations, purchaseDocuments, purchaseDocumentLines, fiscalPeriods, auditEvents } from "@/db/schema";
import { createSettlementEvent, allocateSettlementEvent, listPaymentEvents } from "./service";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";

const s = randomUUID().slice(0, 8);

describe("pagos", () => {
  it("crea pago, asigna parcial, rechaza exceso", async () => {
    const [u] = await db.insert(users).values({ email: `pay-${s}@test.local`, passwordHash: "x", name: "P" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-36${s}-A`, rifOriginal: `J-36${s}-A`, razonSocial: "Pay CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const noParty = await createSettlementEvent(ctx, { partyRif: "J-00000000-0", eventType: "payment", eventDate: "2026-09-10", amount: "50.00" });
      expect(noParty.ok).toBe(false);

      await db.insert(parties).values({ companyId: c!.id, rif: "J123456780", rifOriginal: "J-12345678-0", razonSocial: "Prov P" });
      const pay = await createSettlementEvent(ctx, { partyRif: "J-12345678-0", eventType: "payment", eventDate: "2026-09-10", amount: "100.00", method: "transferencia" });
      expect(pay.ok).toBe(true);
      if (!pay.ok) throw new Error("setup");

      const buy = await createPurchaseDocument(ctx, { partyRif: "J-12345678-0", partyRazon: "Prov P", docNumber: "F-1", controlNumber: "C-1", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "16" });
      expect(buy.ok).toBe(true);
      if (!buy.ok) throw new Error("setup buy");

      const a1 = await allocateSettlementEvent(ctx, pay.id, buy.id, "60.00");
      expect(a1.ok).toBe(true);
      const a2 = await allocateSettlementEvent(ctx, pay.id, buy.id, "50.00");
      expect(a2.ok).toBe(false); // excede disponible 40.00

      const credit = await createSettlementEvent(ctx, {
        partyRif: "J-12345678-0",
        eventType: "account_credit",
        eventDate: "2026-09-08",
        amount: "56.00",
        sourceRef: "AP-100",
      });
      expect(credit.ok).toBe(true);
      if (!credit.ok) throw new Error("setup account credit");
      const overDocument = await allocateSettlementEvent(ctx, credit.id, buy.id, "57.00");
      expect(overDocument.ok).toBe(false);
      const accountCreditAllocation = await allocateSettlementEvent(ctx, credit.id, buy.id, "56.00");
      expect(accountCreditAllocation.ok).toBe(true);
      expect(await listPaymentEvents(ctx)).toHaveLength(1);

      const concurrentBuy = await createPurchaseDocument(ctx, {
        partyRif: "J-12345678-0",
        partyRazon: "Prov P",
        docNumber: `F-C-${s}`,
        controlNumber: `C-C-${s}`,
        fechaDocumento: "2026-09-05",
        fechaFiscal: "2026-09-05",
        baseImponible: "100.00",
        ivaCausado: "16.00",
        total: "116.00",
        alicuota: "16",
      });
      expect(concurrentBuy.ok).toBe(true);
      if (!concurrentBuy.ok) throw new Error("setup concurrent buy");
      const concurrentPayment = await createSettlementEvent(ctx, {
        partyRif: "J-12345678-0",
        eventType: "payment",
        eventDate: "2026-09-11",
        amount: "100.00",
      });
      expect(concurrentPayment.ok).toBe(true);
      if (!concurrentPayment.ok) throw new Error("setup concurrent payment");
      const concurrentAllocations = await Promise.all([
        allocateSettlementEvent(ctx, concurrentPayment.id, concurrentBuy.id, "70.00"),
        allocateSettlementEvent(ctx, concurrentPayment.id, concurrentBuy.id, "70.00"),
      ]);
      expect(concurrentAllocations.filter((result) => result.ok)).toHaveLength(1);
    } finally {
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
      const events = await db.select().from(settlementEvents).where(eq(settlementEvents.companyId, c!.id));
      for (const event of events) await db.delete(settlementAllocations).where(eq(settlementAllocations.eventId, event.id));
      await db.delete(settlementEvents).where(eq(settlementEvents.companyId, c!.id));
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
