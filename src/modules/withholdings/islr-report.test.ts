import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, partyTaxProfiles, purchaseDocuments,
  purchaseDocumentLines, settlementEvents, settlementAllocations, withholdingRules,
  islrWithholdings, islrWithholdingLines, documentSeries, fiscalPeriods, auditEvents,
} from "@/db/schema";
import { upsertParty } from "@/modules/parties/service";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { allocateSettlementEvent, createSettlementEvent } from "@/modules/payments/service";
import {
  issueIslr, listConcepts, getIslrWithholdingsReport, toIslrWithholdingsCsv,
  ISLR_WITHHOLDINGS_CSV_HEAD,
} from "./issue-islr";

const s = randomUUID().slice(0, 8);

describe("CSV reporte retenciones ISLR (puro)", () => {
  it("cabecera + fila + neutraliza inyección (=+-@) y comillas", () => {
    const csv = toIslrWithholdingsCsv([
      { certificateNumber: "ISLR-202609-000001", fechaEmision: "2026-09-20", rif: "J-1", razonSocial: "=Benef MAL", totalRetained: "20.00", status: "issued" },
      { certificateNumber: "ISLR-202609-000002", fechaEmision: "2026-09-21", rif: "@x", razonSocial: 'Con "comillas"', totalRetained: "10.00", status: "voided" },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(ISLR_WITHHOLDINGS_CSV_HEAD);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("'=Benef MAL");
    expect(lines[2]).toContain("'@x");
    expect(lines[2]).toContain('"Con ""comillas"""');
    expect(lines[2]).toContain("voided");
  });

  it("vacío: solo cabecera", () => {
    expect(toIslrWithholdingsCsv([])).toBe(`${ISLR_WITHHOLDINGS_CSV_HEAD}\n`);
  });
});

describe("reporte retenciones ISLR (integración)", () => {
  it("emite y el reporte trae beneficiario + retenido", async () => {
    const [u] = await db.insert(users).values({ email: `ir-${s}@test.local`, passwordHash: "x", name: "I" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-42${s}-C`, rifOriginal: `J-42${s}-C`, razonSocial: "IR CA", condicionIva: "ordinario", agenteRetencionIslr: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const hon = (await listConcepts(ctx)).find((x) => x.codigo === "HON")!;
      await db.insert(withholdingRules).values({
        companyScopeKey: c!.id, ruleKind: "islr", conceptId: hon.id,
        effectiveRange: "[2026-08-01,2026-11-01)", porcentaje: "0.02", sustraendo: "0.00",
        baseFormulaKind: "monto_pagado", legalReference: "test",
      });
      await upsertParty(ctx, { rif: "J-66666666-6", razonSocial: "Benef Rep" });
      const buy = await createPurchaseDocument(ctx, {
        partyRif: "J-66666666-6", partyRazon: "Benef Rep", docNumber: "FR-IR1", controlNumber: "CR-IR1",
        fechaDocumento: "2026-09-01", fechaFiscal: "2026-09-01",
        baseImponible: "1000.00", ivaCausado: "0.00", total: "1000.00", alicuota: "0",
      });
      if (!buy.ok) throw new Error("setup buy");
      const pay = await createSettlementEvent(ctx, { partyRif: "J-66666666-6", eventType: "payment", eventDate: "2026-09-10", amount: "1000.00" });
      if (!pay.ok) throw new Error("setup pay");
      expect((await allocateSettlementEvent(ctx, pay.id, buy.id, "1000.00")).ok).toBe(true);
      const em = await issueIslr(ctx, { settlementEventId: pay.id, conceptId: hon.id, baseSujeta: "1000.00", fechaEmision: "2026-09-20" });
      expect(em.ok).toBe(true);
      if (!em.ok) throw new Error("issue");
      const rows = await getIslrWithholdingsReport(ctx);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        certificateNumber: em.certificateNumber,
        rif: "J-66666666-6",
        razonSocial: "Benef Rep",
        totalRetained: "20.00",
        status: "issued",
      });
    } finally {
      const hs = await db.select().from(islrWithholdings).where(eq(islrWithholdings.companyId, c!.id));
      for (const h of hs) await db.delete(islrWithholdingLines).where(eq(islrWithholdingLines.withholdingId, h.id));
      await db.delete(islrWithholdings).where(eq(islrWithholdings.companyId, c!.id));
      await db.delete(withholdingRules).where(eq(withholdingRules.companyScopeKey, c!.id));
      await db.delete(settlementAllocations).where(eq(settlementAllocations.companyId, c!.id));
      await db.delete(settlementEvents).where(eq(settlementEvents.companyId, c!.id));
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
      await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      const ps = await db.select().from(parties).where(eq(parties.companyId, c!.id));
      for (const p of ps) await db.delete(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, p.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      await db.delete(documentSeries).where(eq(documentSeries.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
