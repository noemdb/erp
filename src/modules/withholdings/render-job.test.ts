import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, partyTaxProfiles, purchaseDocuments,
  purchaseDocumentLines, fiscalPeriods, ivaWithholdings, ivaWithholdingLines,
  documentSeries, attachments, auditEvents,
} from "@/db/schema";
import { upsertParty, setTaxProfile } from "@/modules/parties/service";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { issueIva } from "./issue-iva";
import { renderIvaPdf, listPendingRenders } from "./render-job";

const s = randomUUID().slice(0, 8);

/** 2.0.3 §3.6: el render ocurre fuera de la TX de emisión y es idempotente. */
describe("render post-commit", () => {
  it("pending → done con PDF guardado; segundo intento se niega", async () => {
    const [u] = await db.insert(users).values({ email: `rp-${s}@test.local`, passwordHash: "x", name: "R" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-61${s}-A`, rifOriginal: `J-61${s}-A`, razonSocial: "Rp CA", condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      await upsertParty(ctx, { rif: "J-21212121-2", razonSocial: "Prov" });
      const [pty] = await db.select().from(parties).where(eq(parties.companyId, c!.id)).limit(1);
      await setTaxProfile(ctx, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
      const buy = await createPurchaseDocument(ctx, { partyRif: "J-21212121-2", partyRazon: "Prov", docNumber: "F-R", controlNumber: "C-R", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "16" });
      if (!buy.ok) throw new Error("setup");
      const em = await issueIva(ctx, [buy.id], "2026-09-20");
      if (!em.ok) throw new Error("issue");

      expect(await listPendingRenders(ctx)).toHaveLength(1);
      const r1 = await renderIvaPdf(ctx, em.id);
      expect(r1.ok).toBe(true);
      if (!r1.ok) throw new Error("render");
      const atts = await db.select().from(attachments).where(eq(attachments.companyId, c!.id));
      expect(atts).toHaveLength(1);
      expect(atts[0]!.mime).toBe("application/pdf");
      expect(await listPendingRenders(ctx)).toHaveLength(0);

      const r2 = await renderIvaPdf(ctx, em.id);
      expect(r2.ok).toBe(false); // idempotente: no re-renderiza
    } finally {
      await db.delete(attachments).where(eq(attachments.companyId, c!.id));
      const hs = await db.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
      for (const h of hs) await db.delete(ivaWithholdingLines).where(eq(ivaWithholdingLines.withholdingId, h.id));
      await db.delete(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
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
  }, 180000);
});
