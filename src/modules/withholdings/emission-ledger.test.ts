import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
import { readLedger, maxEmitted, certSeq } from "./emission-ledger";
import { reconcileSeries } from "./reconcile";

const s = randomUUID().slice(0, 8);

describe("emission ledger (2.0.5 §5.3)", () => {
  beforeEach(() => {
    process.env.EMISSION_LEDGER_DIR = mkdtempSync(join(tmpdir(), "ledger-"));
  });

  it("certSeq soporta ambos formatos", () => {
    expect(certSeq("20260900000001")).toBe(1);
    expect(certSeq("ISLR-202609-000001")).toBe(1);
    expect(certSeq("sin-numero")).toBe(0);
  });

  it("emisión escribe al ledger; reconcile OK; hueco se detecta", async () => {
    const [u] = await db.insert(users).values({ email: `led-${s}@test.local`, passwordHash: "x", name: "L" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-62${s}-A`, rifOriginal: `J-62${s}-A`, razonSocial: "Led CA", condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      await upsertParty(ctx, { rif: "J-22222222-2", razonSocial: "Prov" });
      const [pty] = await db.select().from(parties).where(eq(parties.companyId, c!.id)).limit(1);
      await setTaxProfile(ctx, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
      const buy = await createPurchaseDocument(ctx, { partyRif: "J-22222222-2", partyRazon: "Prov", docNumber: "F-L", controlNumber: "C-L", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "16" });
      if (!buy.ok) throw new Error("setup");
      const em = await issueIva(ctx, [buy.id], "2026-09-20");
      expect(em.ok).toBe(true);
      if (!em.ok) throw new Error("issue");

      const entries = readLedger();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ companyId: c!.id, kind: "iva_withholding", certificateNumber: em.certificateNumber });
      expect(maxEmitted(c!.id, "iva_withholding", "202609")).toBe(1);

      const ok = await reconcileSeries(ctx);
      expect(ok.every((r) => r.status === "OK")).toBe(true);

      // Simula restore a T: borra el comprobante de DB (el ledger lo conserva) → GAP_DB.
      const hs = await db.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
      for (const h of hs) await db.delete(ivaWithholdingLines).where(eq(ivaWithholdingLines.withholdingId, h.id));
      await db.delete(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
      await db.update(documentSeries).set({ lastNumber: 0 }).where(eq(documentSeries.companyId, c!.id));
      const gap = await reconcileSeries(ctx);
      expect(gap.some((r) => r.status === "GAP_DB")).toBe(true);
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
