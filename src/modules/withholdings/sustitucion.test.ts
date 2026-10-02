import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, partyTaxProfiles, purchaseDocuments,
  purchaseDocumentLines, fiscalPeriods, ivaWithholdings, ivaWithholdingLines,
  documentSeries, auditEvents,
} from "@/db/schema";
import { upsertParty, setTaxProfile } from "@/modules/parties/service";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { issueIva, voidIva, getIva } from "./issue-iva";

const s = randomUUID().slice(0, 8);

/** 3.8: emitir → anular → sustituir sin reutilizar número. */
describe("sustitución", () => {
  it("sustituto referencia al anulaFdo y usa número nuevo", async () => {
    const [u] = await db.insert(users).values({ email: `sub-${s}@test.local`, passwordHash: "x", name: "S" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-51${s}-A`, rifOriginal: `J-51${s}-A`, razonSocial: "Sub CA", condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      await upsertParty(ctx, { rif: "J-15151515-1", razonSocial: "Prov Sub" });
      const [pty] = await db.select().from(parties).where(eq(parties.companyId, c!.id)).limit(1);
      await setTaxProfile(ctx, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
      const buy = await createPurchaseDocument(ctx, { partyRif: "J-15151515-1", partyRazon: "Prov Sub", docNumber: "F-S", controlNumber: "C-S", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "500.00", ivaCausado: "80.00", total: "580.00", alicuota: "16" });
      expect(buy.ok).toBe(true);
      if (!buy.ok) throw new Error("setup");

      const em1 = await issueIva(ctx, [buy.id], "2026-09-20");
      expect(em1.ok).toBe(true);
      if (!em1.ok) throw new Error("issue1");
      // sustituir sin anular → bloqueado
      const bad = await issueIva(ctx, [buy.id], "2026-09-21", { replacesId: em1.id });
      expect(bad.ok).toBe(false);

      expect((await voidIva(ctx, em1.id, "monto erróneo")).ok).toBe(true);
      const em2 = await issueIva(ctx, [buy.id], "2026-09-21", { replacesId: em1.id });
      expect(em2.ok).toBe(true);
      if (!em2.ok) throw new Error("issue2");
      expect(em2.certificateNumber).not.toBe(em1.certificateNumber);

      const det = await getIva(ctx, em2.id);
      expect(det!.header.replacesId).toBe(em1.id);
    } finally {
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
  });
});
