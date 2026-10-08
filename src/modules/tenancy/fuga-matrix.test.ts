import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, partyTaxProfiles, purchaseDocuments,
  purchaseDocumentLines, fiscalPeriods, ivaWithholdings, ivaWithholdingLines,
  documentSeries, sourceFiles, importBatches, importRows, generatedReports, auditEvents,
} from "@/db/schema";
import { authorize } from "./authorize";
import { getCompanyContext } from "./repo";
import { getPurchaseDetail, createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { upsertParty, setTaxProfile } from "@/modules/parties/service";
import { issueIva } from "@/modules/withholdings/issue-iva";
import { getBatch, uploadImport } from "@/modules/imports/service";
import { getIva } from "@/modules/withholdings/issue-iva";
import { listVersions, getIvaSummary } from "@/modules/reporting/summary";

const s = randomUUID().slice(0, 8);

/** 4.2: matriz usuario×empresa×recurso. Todo acceso cruzado termina en rechazo/ausencia. */
describe("matriz de fuga", () => {
  it("B no toca nada de A; A opera lo suyo", async () => {
    const mk = async (tag: string, role: "admin" | "contador") => {
      const [u] = await db.insert(users).values({ email: `${tag}-${s}@test.local`, passwordHash: "x", name: tag }).returning({ id: users.id });
      const [c] = await db.insert(companies).values({ rif: `J-60${tag}${s}-A`.slice(0, 14), rifOriginal: tag, razonSocial: `${tag} CA`, condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
      await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role });
      return { u: u!, c: c! };
    };
    const A = await mk("fma", "contador");
    const B = await mk("fmb", "admin");
    const ctxA = { companyId: A.c.id, userId: A.u.id };
    const ctxB = { companyId: B.c.id, userId: B.u.id };
    try {
      await upsertParty(ctxA, { rif: "J-17171717-1", razonSocial: "Prov A" });
      const [pty] = await db.select().from(parties).where(eq(parties.companyId, A.c.id)).limit(1);
      await setTaxProfile(ctxA, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
      const buy = await createPurchaseDocument(ctxA, { partyRif: "J-17171717-1", partyRazon: "Prov A", docNumber: "FA-1", controlNumber: "CA-1", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "1000.00", ivaCausado: "160.00", total: "1160.00", alicuota: "0.16" });
      if (!buy.ok) throw new Error("setup buy");
      const em = await issueIva(ctxA, [buy.id], "2026-09-20");
      if (!em.ok) throw new Error("setup issue: " + em.error.code);
      const up = await uploadImport(ctxA, { kind: "purchases", sourceSystem: "manual", originalName: "a.csv" }, Buffer.from("a,b\n1,2\n"));
      if (!up.ok) throw new Error("setup upload");
      const [per] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, A.c.id)).limit(1);

      // Legítimo A
      expect(await getPurchaseDetail(ctxA, buy.id)).not.toBeNull();
      expect((await authorize(A.c.id, A.u.id, "withholdings.issue")).ok).toBe(true);

      // Fuga B → A en todo recurso
      expect(await getPurchaseDetail(ctxB, buy.id)).toBeNull();
      expect(await getCompanyContext(A.c.id, B.u.id)).toBeNull();
      expect(await getBatch(ctxB, up.batchId)).toBeNull();
      expect(await getIva(ctxB, em.id)).toBeNull();
      expect(await listVersions(ctxB, per!.id)).toEqual([]);
      expect(await getIvaSummary(ctxB, per!.id)).toMatchObject({ creditoFiscal: "0.00", debitoFiscal: "0.00" });
      expect((await authorize(A.c.id, B.u.id, "reports.read")).ok).toBe(false);
      expect((await authorize(A.c.id, B.u.id, "withholdings.issue")).ok).toBe(false);
      // UUID manipulado inexistente
      expect(await getPurchaseDetail(ctxB, "00000000-0000-0000-0000-000000000000")).toBeNull();
    } finally {
      for (const { c, u } of [A, B]) {
        const hs = await db.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, c.id));
        for (const h of hs) await db.delete(ivaWithholdingLines).where(eq(ivaWithholdingLines.withholdingId, h.id));
        await db.delete(ivaWithholdings).where(eq(ivaWithholdings.companyId, c.id));
        const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c.id));
        for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
        await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c.id));
        const ps = await db.select().from(parties).where(eq(parties.companyId, c.id));
        for (const p of ps) await db.delete(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, p.id));
        await db.delete(parties).where(eq(parties.companyId, c.id));
        await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c.id));
        const bs = await db.select().from(importBatches).where(eq(importBatches.companyId, c.id));
        for (const b of bs) await db.delete(importRows).where(eq(importRows.batchId, b.id));
        await db.delete(importBatches).where(eq(importBatches.companyId, c.id));
        await db.delete(sourceFiles).where(eq(sourceFiles.companyId, c.id));
        await db.delete(generatedReports).where(eq(generatedReports.companyId, c.id));
        await db.delete(documentSeries).where(eq(documentSeries.companyId, c.id));
        await db.delete(auditEvents).where(eq(auditEvents.companyId, c.id));
        await db.delete(companyUser).where(eq(companyUser.companyId, c.id));
        await db.delete(companies).where(eq(companies.id, c.id));
        await db.delete(users).where(eq(users.id, u.id));
      }
    }
  });
});
