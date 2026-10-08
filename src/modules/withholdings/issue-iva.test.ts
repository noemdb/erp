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
import { previewIva, issueIva, voidIva } from "./issue-iva";

const s = randomUUID().slice(0, 8);

async function setup(nDocs: number) {
  const [u] = await db.insert(users).values({ email: `w-${s}@test.local`, passwordHash: "x", name: "W" }).returning({ id: users.id });
  const [c] = await db.insert(companies).values({ rif: `J-41${s}-A`, rifOriginal: `J-41${s}-A`, razonSocial: "W CA", condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
  await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
  const ctx = { companyId: c!.id, userId: u!.id };
  await upsertParty(ctx, { rif: "J-55555555-5", razonSocial: "Prov Ret" });
  const [pty] = await db.select().from(parties).where(eq(parties.companyId, c!.id)).limit(1);
  await setTaxProfile(ctx, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
  const ids: string[] = [];
  for (let i = 0; i < nDocs; i++) {
    const r = await createPurchaseDocument(ctx, {
      partyRif: "J-55555555-5", partyRazon: "Prov Ret", docNumber: `FW-${i}`, controlNumber: `CW-${i}`,
      fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05",
      baseImponible: "1000.00", ivaCausado: "160.00", total: "1160.00", alicuota: "0.16",
    });
    if (!r.ok) throw new Error("setup buy " + i);
    ids.push(r.id);
  }
  return { ctx, u: u!, c: c!, ids };
}

async function cleanup(cId: string, uId: string) {
  const hs = await db.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, cId));
  for (const h of hs) await db.delete(ivaWithholdingLines).where(eq(ivaWithholdingLines.withholdingId, h.id));
  await db.delete(ivaWithholdings).where(eq(ivaWithholdings.companyId, cId));
  const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, cId));
  for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
  await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, cId));
  const ps = await db.select().from(parties).where(eq(parties.companyId, cId));
  for (const p of ps) await db.delete(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, p.id));
  await db.delete(parties).where(eq(parties.companyId, cId));
  await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, cId));
  await db.delete(documentSeries).where(eq(documentSeries.companyId, cId));
  await db.delete(auditEvents).where(eq(auditEvents.companyId, cId));
  await db.delete(companyUser).where(eq(companyUser.companyId, cId));
  await db.delete(companies).where(eq(companies.id, cId));
  await db.delete(users).where(eq(users.id, uId));
}

describe("emisión IVA", () => {
  it("preview → issue multi-factura → doble emisión bloqueada → anulación", async () => {
    const { ctx, u, c, ids } = await setup(2);
    try {
      const pv = await previewIva(ctx, ids, "2026-09-20");
      expect(pv.ok).toBe(true);
      if (!pv.ok) throw new Error("preview");
      expect(pv.total).toBe("240.00"); // 2 × 120.00

      const em = await issueIva(ctx, ids, "2026-09-20");
      expect(em.ok).toBe(true);
      if (!em.ok) throw new Error("issue");
      expect(em.certificateNumber).toMatch(/^202609\d{8}$/);
      expect(em.total).toBe("240.00");

      const dup = await issueIva(ctx, [ids[0]!], "2026-09-20");
      expect(dup.ok).toBe(false);

      const v = await voidIva(ctx, em.id, "datos erróneos");
      expect(v.ok).toBe(true);
      const v2 = await voidIva(ctx, em.id, "otra vez");
      expect(v2.ok).toBe(false); // voided no re-anulable
    } finally {
      await cleanup(c.id, u.id);
    }
  });

  it("4.3: 20 emisiones completas paralelas, certificados únicos y consecutivos", { timeout: 180000 }, async () => {
    const { ctx, u, c, ids } = await setup(20);
    try {
      const res = await Promise.all(ids.map((id) => issueIva(ctx, [id], "2026-09-21")));
      expect(res.every((r) => r.ok)).toBe(true);
      const certs = res.filter((r) => r.ok).map((r) => (r as { certificateNumber: string }).certificateNumber);
      expect(new Set(certs).size).toBe(20);
      const seqs = certs.map((x) => Number(x.slice(-8))).sort((a, b) => a - b);
      expect(seqs[19]! - seqs[0]!).toBe(19);
    } finally {
      await cleanup(c.id, u.id);
    }
  });
});
