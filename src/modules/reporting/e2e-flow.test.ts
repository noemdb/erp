import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, partyTaxProfiles, purchaseDocuments,
  purchaseDocumentLines, fiscalPeriods, ivaWithholdings, ivaWithholdingLines,
  documentSeries, sourceFiles, importBatches, importRows, generatedReports, auditEvents,
} from "@/db/schema";
import { upsertParty, setTaxProfile } from "@/modules/parties/service";
import { uploadImport } from "@/modules/imports/service";
import { validateBatch } from "@/modules/imports/validate";
import { confirmImport } from "@/modules/imports/confirm";
import { previewIva, issueIva } from "@/modules/withholdings/issue-iva";
import { sendToReview, closePeriod, reopenPeriod } from "@/modules/periods/service";
import { getIvaSummary, saveSummaryVersion } from "./summary";

const s = randomUUID().slice(0, 8);

/** 4.4 (por servicios): importar → validar → confirmar → calcular → emitir → cerrar → resumir. */
describe("flujo E2E por servicios", () => {
  it("cadena completa sin intervención HTTP", async () => {
    const [u] = await db.insert(users).values({ email: `e2e-${s}@test.local`, passwordHash: "x", name: "E" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-54${s}-A`, rifOriginal: `J-54${s}-A`, razonSocial: "E2E CA", condicionIva: "ordinario", agenteRetencionIva: true }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      await upsertParty(ctx, { rif: "J-19191919-1", razonSocial: "Prov E2E" });
      const [pty] = await db.select().from(parties).where(eq(parties.companyId, c!.id)).limit(1);
      await setTaxProfile(ctx, pty!.id, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });

      const csv = Buffer.from("fecha,rif,factura,control,base,iva,total\n05/09/2026,J-19191919-1,FE-1,CE-1,1000.00,160.00,1160.00\n", "utf8");
      const up = await uploadImport(ctx, { kind: "purchases", sourceSystem: "manual", originalName: "e2e.csv" }, csv);
      expect(up.ok).toBe(true);
      if (!up.ok) throw new Error("upload");
      const v = await validateBatch(ctx, up.batchId);
      expect(v.ok && v.valid).toBe(1);
      const cf = await confirmImport(ctx, up.batchId);
      expect(cf.ok && cf.created).toBe(1);

      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      const pv = await previewIva(ctx, [docs[0]!.id], "2026-09-20");
      expect(pv.ok && pv.total).toBe("120.00");
      const em = await issueIva(ctx, [docs[0]!.id], "2026-09-20");
      expect(em.ok).toBe(true);

      const [per] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id)).limit(1);
      expect((await sendToReview(ctx, per!.id)).ok).toBe(true);
      expect((await saveSummaryVersion(ctx, per!.id)).version).toBe(1);
      expect((await closePeriod(ctx, per!.id)).ok).toBe(true);

      const sum = await getIvaSummary(ctx, per!.id);
      expect(sum).toMatchObject({ creditoFiscal: "160.00", retIvaEmitidas: "120.00" });
    } finally {
      // Reabrir antes de borrar: el trigger impide DELETE en cerrado.
      const pers = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      for (const p of pers.filter((x) => x.status === "closed")) await reopenPeriod(ctx, p.id, "limpieza test");
      const hs = await db.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
      for (const h of hs) await db.delete(ivaWithholdingLines).where(eq(ivaWithholdingLines.withholdingId, h.id));
      await db.delete(ivaWithholdings).where(eq(ivaWithholdings.companyId, c!.id));
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
      await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      const ps = await db.select().from(parties).where(eq(parties.companyId, c!.id));
      for (const p of ps) await db.delete(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, p.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(generatedReports).where(eq(generatedReports.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      const bs = await db.select().from(importBatches).where(eq(importBatches.companyId, c!.id));
      for (const b of bs) await db.delete(importRows).where(eq(importRows.batchId, b.id));
      await db.delete(importBatches).where(eq(importBatches.companyId, c!.id));
      await db.delete(sourceFiles).where(eq(sourceFiles.companyId, c!.id));
      await db.delete(documentSeries).where(eq(documentSeries.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
