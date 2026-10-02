import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, purchaseDocuments, purchaseDocumentLines,
  fiscalPeriods, withholdingsReceived, receivedLinks, auditEvents,
} from "@/db/schema";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { registerReceived, conciliateReceived, applyReceived, voidReceived } from "./service";

const s = randomUUID().slice(0, 8);

/** Corpus G3 ejecutable (casos 01–08; 09 es documental: ISLR fuera del IVA). */
describe("corpus G3", () => {
  it("cubre registrada/conciliada/aplicada, exceso, duplicado, anulada, sin factura", async () => {
    const [u] = await db.insert(users).values({ email: `g3c-${s}@test.local`, passwordHash: "x", name: "G" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-59${s}-A`, rifOriginal: `J-59${s}-A`, razonSocial: "G3c CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    const reg = (n: string, cert: string, monto: string, ids: string[]) =>
      registerReceived(ctx, { agentRif: "J-99999999-9", agentRazon: "Agente", certificateNumber: cert, fechaComprobante: "2026-09-20", fechaRecepcion: "2026-09-21", ivaCausado: "160.00", montoRetenido: monto, purchaseDocumentIds: ids, notes: n });
    try {
      const b1 = await createPurchaseDocument(ctx, { partyRif: "J-20202020-2", partyRazon: "P1", docNumber: "F-1", controlNumber: "C-1", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "1000.00", ivaCausado: "160.00", total: "1160.00", alicuota: "16" });
      const b2 = await createPurchaseDocument(ctx, { partyRif: "J-20202020-2", partyRazon: "P1", docNumber: "F-2", controlNumber: "C-2", fechaDocumento: "2026-09-06", fechaFiscal: "2026-09-06", baseImponible: "500.00", ivaCausado: "80.00", total: "580.00", alicuota: "16" });
      expect(b1.ok && b2.ok).toBe(true);
      if (!b1.ok || !b2.ok) throw new Error("setup");

      // G3-01/02: una y varias facturas concilian
      const r1 = await reg("01", "CERT-01", "120.00", [b1.id]);
      expect(r1.ok).toBe(true);
      if (!r1.ok) throw new Error("r1");
      expect((await conciliateReceived(ctx, r1.id, false)).ok).toBe(true);
      const r2 = await reg("02", "CERT-02", "200.00", [b1.id, b2.id]);
      expect(r2.ok).toBe(true);
      if (!r2.ok) throw new Error("r2");
      expect((await conciliateReceived(ctx, r2.id, false)).ok).toBe(true);

      // G3-03: sin factura no concilia
      const r3 = await reg("03", "CERT-03", "10.00", []);
      expect(r3.ok).toBe(true);
      if (!r3.ok) throw new Error("r3");
      expect((await conciliateReceived(ctx, r3.id, false)).ok).toBe(false);

      // G3-04: exceso exige motivo
      const r4 = await reg("04", "CERT-04", "500.00", [b1.id]);
      expect(r4.ok).toBe(true);
      if (!r4.ok) throw new Error("r4");
      expect((await conciliateReceived(ctx, r4.id, false)).ok).toBe(false);
      expect((await conciliateReceived(ctx, r4.id, true, "aceptado")).ok).toBe(true);

      // G3-05/06: duplicado bloquea; anulada con motivo
      expect((await reg("05", "CERT-01", "1.00", [])).ok).toBe(false);
      expect((await voidReceived(ctx, r4.id, "prueba")).ok).toBe(true);

      // G3-07: aplica a período elegido
      const [per] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id)).limit(1);
      expect((await applyReceived(ctx, r1.id, per!.id)).ok).toBe(true);
    } finally {
      const rs = await db.select().from(withholdingsReceived).where(eq(withholdingsReceived.companyId, c!.id));
      for (const r of rs) await db.delete(receivedLinks).where(eq(receivedLinks.receivedId, r.id));
      await db.delete(withholdingsReceived).where(eq(withholdingsReceived.companyId, c!.id));
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
      await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
