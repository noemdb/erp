import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, settlementEvents, settlementAllocations,
  withholdingConcepts, withholdingRules, islrWithholdings, islrWithholdingLines,
  documentSeries, fiscalPeriods, auditEvents, purchaseDocuments, purchaseDocumentLines,
} from "@/db/schema";
import { upsertParty } from "@/modules/parties/service";
import { allocateSettlementEvent, createSettlementEvent } from "@/modules/payments/service";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { configureAbonoCriterion } from "./g2-criterion";
import { previewIslr, issueIslr, voidIslr, listConcepts } from "./issue-islr";

const s = randomUUID().slice(0, 8);

describe("emisión ISLR", () => {
  it("preview → issue → duplicado bloqueado → anulación; serie provisional", async () => {
    const [u] = await db.insert(users).values({ email: `islr-${s}@test.local`, passwordHash: "x", name: "I" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-42${s}-A`, rifOriginal: `J-42${s}-A`, razonSocial: "Islr CA", condicionIva: "ordinario", agenteRetencionIslr: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const concepts = await listConcepts(ctx);
      expect(concepts.length).toBeGreaterThanOrEqual(6);
      const hon = concepts.find((x) => x.codigo === "HON")!;
      // Regla de empresa (imita matriz v1: 2% sin sustraendo para honorarios)
      await db.insert(withholdingRules).values({
        companyScopeKey: c!.id, ruleKind: "islr", conceptId: hon.id,
        effectiveRange: "[2026-08-01,2026-11-01)", porcentaje: "0.02", sustraendo: "0.00",
        baseFormulaKind: "monto_pagado", legalReference: "test",
      });
      await upsertParty(ctx, { rif: "J-66666666-6", razonSocial: "Beneficiario" });
      const initialPurchase = await createPurchaseDocument(ctx, {
        partyRif: "J-66666666-6",
        partyRazon: "Beneficiario",
        docNumber: `F-BASE-${s}`,
        controlNumber: `C-BASE-${s}`,
        fechaDocumento: "2026-09-01",
        fechaFiscal: "2026-09-01",
        baseImponible: "1000.00",
        ivaCausado: "0.00",
        total: "1000.00",
        alicuota: "0",
      });
      expect(initialPurchase.ok).toBe(true);
      if (!initialPurchase.ok) throw new Error("setup initial purchase");
      const pay = await createSettlementEvent(ctx, { partyRif: "J-66666666-6", eventType: "payment", eventDate: "2026-09-10", amount: "1000.00" });
      expect(pay.ok).toBe(true);
      if (!pay.ok) throw new Error("setup");
      expect((await allocateSettlementEvent(ctx, pay.id, initialPurchase.id, "1000.00")).ok).toBe(true);
      const input = { settlementEventId: pay.id, conceptId: hon.id, baseSujeta: "1000.00", fechaEmision: "2026-09-20" };

      const pv = await previewIslr(ctx, input);
      expect(pv.ok).toBe(true);
      if (!pv.ok) throw new Error("preview");
      expect(pv.retainedAmount).toBe("20.00");
      expect(pv).toMatchObject({ criterion: "unset", converged: true, canIssue: true });
      expect(pv.paymentOnly).toMatchObject({ fechaRetencion: "2026-09-10", periodo: "202609" });
      expect(pv.accountCreditOrPayment).toMatchObject({ fechaRetencion: "2026-09-10", retainedAmount: "20.00" });

      const credit = await createSettlementEvent(ctx, {
        partyRif: "J-66666666-6",
        eventType: "account_credit",
        eventDate: "2026-09-15",
        amount: "1000.00",
      });
      expect(credit.ok).toBe(true);
      if (!credit.ok) throw new Error("setup account credit");
      const laterCreditPurchase = await createPurchaseDocument(ctx, {
        partyRif: "J-66666666-6",
        partyRazon: "Beneficiario",
        docNumber: `F-LATER-CREDIT-${s}`,
        controlNumber: `C-LATER-CREDIT-${s}`,
        fechaDocumento: "2026-09-01",
        fechaFiscal: "2026-09-01",
        baseImponible: "1000.00",
        ivaCausado: "0.00",
        total: "1000.00",
        alicuota: "0",
      });
      expect(laterCreditPurchase.ok).toBe(true);
      if (!laterCreditPurchase.ok) throw new Error("setup later credit purchase");
      expect((await allocateSettlementEvent(ctx, credit.id, laterCreditPurchase.id, "1000.00")).ok).toBe(true);
      const blocked = await previewIslr(ctx, { ...input, settlementEventId: credit.id });
      expect(blocked).toMatchObject({ ok: true, canIssue: false, converged: false });
      if (blocked.ok) expect(blocked.blockReason).toMatch(/sin configurar/);
      expect((await previewIslr(ctx, input)).ok).toBe(true);
      {
        const em = await issueIslr(ctx, input);
        expect(em.ok).toBe(true);
        if (!em.ok) throw new Error("issue");
        expect(em.certificateNumber.startsWith("ISLR-202609-")).toBe(true);
        const dup = await issueIslr(ctx, input);
        expect(dup.ok).toBe(false);
        expect((await voidIslr(ctx, em.id, "error concepto")).ok).toBe(true);
      }

      const createPurchase = async (docNumber: string) => {
        const result = await createPurchaseDocument(ctx, {
          partyRif: "J-66666666-6",
          partyRazon: "Beneficiario",
          docNumber,
          controlNumber: `C-${docNumber}`,
          fechaDocumento: "2026-09-01",
          fechaFiscal: "2026-09-01",
          baseImponible: "100.00",
          ivaCausado: "16.00",
          total: "116.00",
          alicuota: "16",
        });
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("setup purchase");
        return result.id;
      };
      const makeEvent = async (eventType: "payment" | "account_credit", eventDate: string, amount: string) => {
        const result = await createSettlementEvent(ctx, { partyRif: "J-66666666-6", eventType, eventDate, amount });
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("setup settlement event");
        return result.id;
      };

      const assignedEarlierCredit = await makeEvent("account_credit", "2026-08-31", "50.00");
      const sharedDocument = await createPurchase(`F-SHARED-${s}`);
      expect((await allocateSettlementEvent(ctx, assignedEarlierCredit, sharedDocument, "50.00")).ok).toBe(true);

      const overlappingPayment = await makeEvent("payment", "2026-09-10", "50.00");
      expect((await allocateSettlementEvent(ctx, overlappingPayment, sharedDocument, "50.00")).ok).toBe(true);
      const overlappingPreview = await previewIslr(ctx, {
        ...input,
        settlementEventId: overlappingPayment,
        baseSujeta: "50.00",
      });
      expect(overlappingPreview).toMatchObject({ ok: true, canIssue: false, converged: false });

      const separateDocument = await createPurchase(`F-SEPARATE-${s}`);
      const separatePayment = await makeEvent("payment", "2026-09-10", "100.00");
      expect((await allocateSettlementEvent(ctx, separatePayment, separateDocument, "100.00")).ok).toBe(true);
      const independentPreview = await previewIslr(ctx, { ...input, settlementEventId: separatePayment, baseSujeta: "100.00" });
      expect(independentPreview).toMatchObject({ ok: true, canIssue: true, converged: true });

      await upsertParty(ctx, { rif: "J-77777777-7", razonSocial: "Beneficiario sin asignación" });
      const unallocatedCredit = await createSettlementEvent(ctx, {
        partyRif: "J-77777777-7", eventType: "account_credit", eventDate: "2026-08-30", amount: "20.00",
      });
      expect(unallocatedCredit.ok).toBe(true);
      const unallocatedPayment = await createSettlementEvent(ctx, {
        partyRif: "J-77777777-7", eventType: "payment", eventDate: "2026-09-10", amount: "100.00",
      });
      expect(unallocatedPayment.ok).toBe(true);
      if (!unallocatedPayment.ok) throw new Error("setup unallocated payment");
      const thirdDocumentResult = await createPurchaseDocument(ctx, {
        partyRif: "J-77777777-7",
        partyRazon: "Beneficiario sin asignación",
        docNumber: `F-UNALLOCATED-${s}`,
        controlNumber: `C-UNALLOCATED-${s}`,
        fechaDocumento: "2026-09-01",
        fechaFiscal: "2026-09-01",
        baseImponible: "100.00",
        ivaCausado: "16.00",
        total: "116.00",
        alicuota: "16",
      });
      expect(thirdDocumentResult.ok).toBe(true);
      if (!thirdDocumentResult.ok) throw new Error("setup unallocated purchase");
      const thirdDocument = thirdDocumentResult.id;
      expect((await allocateSettlementEvent(ctx, unallocatedPayment.id, thirdDocument, "100.00")).ok).toBe(true);
      expect(
        await previewIslr(ctx, { ...input, settlementEventId: unallocatedPayment.id, baseSujeta: "100.00" }),
      ).toMatchObject({ ok: true, canIssue: false, converged: false });

      const sameDayPurchase = await createPurchase(`F-SAME-DAY-${s}`);
      const sameDayPayment = await makeEvent("payment", "2026-10-10", "50.00");
      const sameDayCredit = await makeEvent("account_credit", "2026-10-10", "50.00");
      expect((await allocateSettlementEvent(ctx, sameDayPayment, sameDayPurchase, "50.00")).ok).toBe(true);
      expect((await allocateSettlementEvent(ctx, sameDayCredit, sameDayPurchase, "50.00")).ok).toBe(true);
      const convergentSameDay = await previewIslr(ctx, { ...input, settlementEventId: sameDayPayment, baseSujeta: "50.00" });
      expect(convergentSameDay).toMatchObject({ ok: true, canIssue: true, converged: true });
      if (convergentSameDay.ok) {
        expect(convergentSameDay.paymentOnly.fechaRetencion).toBe("2026-10-10");
        expect(convergentSameDay.accountCreditOrPayment.fechaRetencion).toBe("2026-10-10");
      }

      expect(await configureAbonoCriterion(ctx, { criterion: "payment_only", reason: "corto" })).toMatchObject({
        ok: false,
        error: { code: "VALIDATION_ERROR" },
      });
      const paymentOnlyConfig = await configureAbonoCriterion(ctx, {
        criterion: "payment_only",
        reason: "Criterio pago-only validado para prueba",
      });
      expect(paymentOnlyConfig).toMatchObject({ ok: true, criterion: "payment_only", unchanged: false });
      const paymentOnlyConfigured = await previewIslr(ctx, {
        ...input,
        settlementEventId: overlappingPayment,
        baseSujeta: "50.00",
      });
      expect(paymentOnlyConfigured).toMatchObject({ ok: true, canIssue: true, criterion: "payment_only" });

      const configured = await configureAbonoCriterion(ctx, {
        criterion: "account_credit_or_payment",
        reason: "Criterio de prueba aprobado para escenario aislado",
      });
      expect(configured).toMatchObject({ ok: true, criterion: "account_credit_or_payment", unchanged: false });
      const configuredCreditPurchase = await createPurchase(`F-CONFIGURED-CREDIT-${s}`);
      const configuredCredit = await makeEvent("account_credit", "2026-10-15", "50.00");
      expect((await allocateSettlementEvent(ctx, configuredCredit, configuredCreditPurchase, "50.00")).ok).toBe(true);
      const configuredCreditPreview = await previewIslr(ctx, { ...input, settlementEventId: configuredCredit, baseSujeta: "50.00" });
      expect(configuredCreditPreview).toMatchObject({
        ok: true,
        canIssue: true,
        criterion: "account_credit_or_payment",
      });
      const configuredCreditIssue = await issueIslr(ctx, { ...input, settlementEventId: configuredCredit, baseSujeta: "50.00" });
      expect(configuredCreditIssue.ok).toBe(true);
      const retroactiveCredit = await createSettlementEvent(ctx, {
        partyRif: "J-66666666-6",
        eventType: "account_credit",
        eventDate: "2026-10-01",
        amount: "10.00",
      });
      expect(retroactiveCredit).toMatchObject({
        ok: false,
        error: { code: "G2_EVENT_REVIEW_REQUIRED" },
      });
      const criterionAudit = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.companyId, c!.id));
      expect(criterionAudit.filter((row) => row.entityType === "company_abono_criterion")).toHaveLength(2);
    } finally {
      const hs = await db.select().from(islrWithholdings).where(eq(islrWithholdings.companyId, c!.id));
      for (const h of hs) await db.delete(islrWithholdingLines).where(eq(islrWithholdingLines.withholdingId, h.id));
      await db.delete(islrWithholdings).where(eq(islrWithholdings.companyId, c!.id));
      const events = await db.select().from(settlementEvents).where(eq(settlementEvents.companyId, c!.id));
      for (const event of events) await db.delete(settlementAllocations).where(eq(settlementAllocations.eventId, event.id));
      await db.delete(settlementEvents).where(eq(settlementEvents.companyId, c!.id));
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const doc of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, doc.id));
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
  }, 120000);
});
