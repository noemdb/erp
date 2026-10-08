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
import { issueIva } from "./issue-iva";

const s = randomUUID().slice(0, 8);

/** 4.3: dos emisiones simultáneas sobre el mismo documento → exactamente una gana. */
describe("misma factura concurrente", () => {
  it("1 ok + 1 rechazada, sin duplicados", async () => {
    const [u] = await db.insert(users).values({ email: `sd-${s}@test.local`, passwordHash: "x", name: "S" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-53${s}-A`, rifOriginal: `J-53${s}-A`, razonSocial: "Sd CA", condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      await upsertParty(ctx, { rif: "J-18181818-1", razonSocial: "Prov" });
      const [pty] = await db.select().from(parties).where(eq(parties.companyId, c!.id)).limit(1);
      await setTaxProfile(ctx, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
      const buy = await createPurchaseDocument(ctx, { partyRif: "J-18181818-1", partyRazon: "Prov", docNumber: "F-SD", controlNumber: "C-SD", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "0.16" });
      if (!buy.ok) throw new Error("setup");
      const [a, b] = await Promise.all([issueIva(ctx, [buy.id], "2026-09-20"), issueIva(ctx, [buy.id], "2026-09-20")]);
      expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
      const certs = await db.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
      expect(certs).toHaveLength(1);
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
