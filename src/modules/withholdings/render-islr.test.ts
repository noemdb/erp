import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, settlementEvents, settlementAllocations,
  withholdingRules, islrWithholdings, islrWithholdingLines,
  documentSeries, fiscalPeriods, purchaseDocuments, purchaseDocumentLines,
  attachments, auditEvents,
} from "@/db/schema";
import { upsertParty } from "@/modules/parties/service";
import { allocateSettlementEvent, createSettlementEvent } from "@/modules/payments/service";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { issueIslr, listConcepts } from "./issue-islr";
import { renderIslrPdf, listPendingRenders } from "./render-job";

const s = randomUUID().slice(0, 8);

/** REP-01: render ISLR post-commit, mismo patrón que IVA (ADR-027). */
describe("render ISLR post-commit", () => {
  it("pending → done con PDF guardado; segundo intento se niega", async () => {
    const [u] = await db.insert(users).values({ email: `ri-${s}@test.local`, passwordHash: "x", name: "R" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-71${s}-A`, rifOriginal: `J-71${s}-A`, razonSocial: "Ri CA", condicionIva: "ordinario", agenteRetencionIslr: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const hon = (await listConcepts(ctx)).find((x) => x.codigo === "HON")!;
      await db.insert(withholdingRules).values({
        companyScopeKey: c!.id, ruleKind: "islr", conceptId: hon.id,
        effectiveRange: "[2026-08-01,2026-11-01)", porcentaje: "0.02", sustraendo: "0.00",
        baseFormulaKind: "monto_pagado", legalReference: "test",
      });
      await upsertParty(ctx, { rif: "J-71717171-1", razonSocial: "Beneficiario" });
      const buy = await createPurchaseDocument(ctx, {
        partyRif: "J-71717171-1", partyRazon: "Beneficiario", docNumber: `F-RI-${s}`, controlNumber: `C-RI-${s}`,
        fechaDocumento: "2026-09-01", fechaFiscal: "2026-09-01",
        baseImponible: "1000.00", ivaCausado: "0.00", total: "1000.00", alicuota: "0",
      });
      if (!buy.ok) throw new Error("setup purchase");
      const pay = await createSettlementEvent(ctx, { partyRif: "J-71717171-1", eventType: "payment", eventDate: "2026-09-10", amount: "1000.00" });
      if (!pay.ok) throw new Error("setup event");
      expect((await allocateSettlementEvent(ctx, pay.id, buy.id, "1000.00")).ok).toBe(true);
      const em = await issueIslr(ctx, { settlementEventId: pay.id, conceptId: hon.id, baseSujeta: "1000.00", fechaEmision: "2026-09-20" });
      if (!em.ok) throw new Error("issue");

      const pend = await listPendingRenders(ctx);
      expect(pend).toHaveLength(1);
      expect(pend[0]!.kind).toBe("islr");
      const r1 = await renderIslrPdf(ctx, em.id);
      expect(r1.ok).toBe(true);
      if (!r1.ok) throw new Error("render");
      const atts = await db.select().from(attachments).where(eq(attachments.companyId, c!.id));
      expect(atts).toHaveLength(1);
      expect(atts[0]!.mime).toBe("application/pdf");
      expect(await listPendingRenders(ctx)).toHaveLength(0);

      const r2 = await renderIslrPdf(ctx, em.id);
      expect(r2.ok).toBe(false); // idempotente: no re-renderiza
    } finally {
      await db.delete(attachments).where(eq(attachments.companyId, c!.id));
      const hs = await db.select().from(islrWithholdings).where(eq(islrWithholdings.companyId, c!.id));
      for (const h of hs) await db.delete(islrWithholdingLines).where(eq(islrWithholdingLines.withholdingId, h.id));
      await db.delete(islrWithholdings).where(eq(islrWithholdings.companyId, c!.id));
      const events = await db.select().from(settlementEvents).where(eq(settlementEvents.companyId, c!.id));
      for (const event of events) await db.delete(settlementAllocations).where(eq(settlementAllocations.eventId, event.id));
      await db.delete(settlementEvents).where(eq(settlementEvents.companyId, c!.id));
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
      await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      await db.delete(documentSeries).where(eq(documentSeries.companyId, c!.id));
      await db.delete(withholdingRules).where(eq(withholdingRules.companyScopeKey, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  }, 180000);
});
