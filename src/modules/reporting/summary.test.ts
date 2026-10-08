import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, purchaseDocuments, purchaseDocumentLines,
  salesDocuments, salesDocumentLines, fiscalPeriods, ivaWithholdings, ivaWithholdingLines,
  documentSeries, generatedReports, auditEvents,
} from "@/db/schema";
import { upsertParty, setTaxProfile } from "@/modules/parties/service";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { createSalesDocument } from "@/modules/sales/service";
import { issueIva } from "@/modules/withholdings/issue-iva";
import { getIvaSummary, getConciliation, saveSummaryVersion, checkReproducible } from "./summary";

const s = randomUUID().slice(0, 8);

describe("resumen y conciliación", () => {
  it("cuadra débitos/créditos/retenciones, congela y reproduce", async () => {
    const [u] = await db.insert(users).values({ email: `rep-${s}@test.local`, passwordHash: "x", name: "R" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-43${s}-A`, rifOriginal: `J-43${s}-A`, razonSocial: "Rep CA", condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      await upsertParty(ctx, { rif: "J-77777777-7", razonSocial: "Prov R" });
      const [pty] = await db.select().from(parties).where(eq(parties.companyId, c!.id)).limit(1);
      await setTaxProfile(ctx, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
      const buy = await createPurchaseDocument(ctx, { partyRif: "J-77777777-7", partyRazon: "Prov R", docNumber: "F-1", controlNumber: "C-1", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "1000.00", ivaCausado: "160.00", total: "1160.00", alicuota: "0.16" });
      expect(buy.ok).toBe(true);
      if (!buy.ok) throw new Error("setup");
      const sale = await createSalesDocument(ctx, { partyRif: "J-88888888-8", partyRazon: "Cli", docNumber: "V-1", controlNumber: "VC-1", fechaDocumento: "2026-09-06", fechaFiscal: "2026-09-06", baseImponible: "2000.00", ivaCausado: "320.00", total: "2320.00", alicuota: "0.16" });
      expect(sale.ok).toBe(true);
      if (!sale.ok) throw new Error("setup sale");
      const em = await issueIva(ctx, [buy.id], "2026-09-20");
      expect(em.ok).toBe(true);

      const [per] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id)).limit(1);
      const sum = await getIvaSummary(ctx, per!.id);
      expect(sum).toMatchObject({ creditoFiscal: "160.00", debitoFiscal: "320.00", retIvaEmitidas: "120.00", cuotaPeriodo: "160.00" });

      const conci = await getConciliation(ctx, per!.id);
      expect(conci.ok).toBe(true);

      const v1 = await saveSummaryVersion(ctx, per!.id);
      expect(v1.version).toBe(1);
      const repro1 = await checkReproducible(ctx, per!.id);
      expect(repro1.match).toBe(true);

      // nuevo documento → ya no reproduce v1
      await createSalesDocument(ctx, { partyRif: "J-88888888-8", partyRazon: "Cli", docNumber: "V-2", controlNumber: "VC-2", fechaDocumento: "2026-09-07", fechaFiscal: "2026-09-07", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "0.16" });
      const repro2 = await checkReproducible(ctx, per!.id);
      expect(repro2.match).toBe(false);
    } finally {
      const hs = await db.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
      for (const h of hs) await db.delete(ivaWithholdingLines).where(eq(ivaWithholdingLines.withholdingId, h.id));
      await db.delete(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
      await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      const ss = await db.select().from(salesDocuments).where(eq(salesDocuments.companyId, c!.id));
      const { salesDocumentLines } = await import("@/db/schema");
      for (const d of ss) await db.delete(salesDocumentLines).where(eq(salesDocumentLines.documentId, d.id));
      await db.delete(salesDocuments).where(eq(salesDocuments.companyId, c!.id));
      await db.delete(generatedReports).where(eq(generatedReports.companyId, c!.id));
      const ps = await db.select().from(parties).where(eq(parties.companyId, c!.id));
      const { partyTaxProfiles } = await import("@/db/schema");
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
