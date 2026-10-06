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
import {
  issueIva, getIvaWithholdingsReport, toIvaWithholdingsCsv,
  IVA_WITHHOLDINGS_CSV_HEAD,
} from "./issue-iva";

const s = randomUUID().slice(0, 8);

async function setup() {
  const [u] = await db.insert(users).values({ email: `wr-${s}@test.local`, passwordHash: "x", name: "W" }).returning({ id: users.id });
  const [c] = await db.insert(companies).values({ rif: `J-42${s}-B`, rifOriginal: `J-42${s}-B`, razonSocial: "WR CA", condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
  await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
  const ctx = { companyId: c!.id, userId: u!.id };
  await upsertParty(ctx, { rif: "J-66666666-6", razonSocial: "Prov Rep" });
  const [pty] = await db.select().from(parties).where(eq(parties.companyId, c!.id)).limit(1);
  await setTaxProfile(ctx, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
  const r = await createPurchaseDocument(ctx, {
    partyRif: "J-66666666-6", partyRazon: "Prov Rep", docNumber: "FR-1", controlNumber: "CR-1",
    fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05",
    baseImponible: "1000.00", ivaCausado: "160.00", total: "1160.00", alicuota: "16",
  });
  if (!r.ok) throw new Error("setup buy");
  return { ctx, u: u!, c: c!, docId: r.id };
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

describe("CSV reporte retenciones IVA (puro)", () => {
  it("cabecera + fila + neutraliza inyección (=+-@) y comillas", () => {
    const csv = toIvaWithholdingsCsv([
      { certificateNumber: "20260900000001", fechaEmision: "2026-09-20", rif: "J-1", razonSocial: "=Prov MAL", totalRetained: "120.00", status: "issued" },
      { certificateNumber: "20260900000002", fechaEmision: "2026-09-21", rif: "@x", razonSocial: 'Con "comillas"', totalRetained: "60.00", status: "voided" },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(IVA_WITHHOLDINGS_CSV_HEAD);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("'=Prov MAL");
    expect(lines[2]).toContain("'@x");
    expect(lines[2]).toContain('"Con ""comillas"""');
    expect(lines[2]).toContain("voided");
  });

  it("vacío: solo cabecera", () => {
    expect(toIvaWithholdingsCsv([])).toBe(`${IVA_WITHHOLDINGS_CSV_HEAD}\n`);
  });
});

describe("reporte retenciones IVA (integración)", () => {
  it("emite y el reporte trae beneficiario + retenido", async () => {
    const { ctx, u, c, docId } = await setup();
    try {
      const em = await issueIva(ctx, [docId], "2026-09-20");
      expect(em.ok).toBe(true);
      if (!em.ok) throw new Error("issue");
      const rows = await getIvaWithholdingsReport(ctx);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        certificateNumber: em.certificateNumber,
        rif: "J-66666666-6",
        razonSocial: "Prov Rep",
        totalRetained: "120.00",
        status: "issued",
      });
    } finally {
      await cleanup(c.id, u.id);
    }
  });
});
