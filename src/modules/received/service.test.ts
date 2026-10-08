import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, purchaseDocuments, purchaseDocumentLines,
  fiscalPeriods, withholdingsReceived, receivedLinks, auditEvents,
} from "@/db/schema";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { registerReceived, conciliateReceived, applyReceived, voidReceived, sumAppliedReceived } from "./service";
import { getIvaSummary } from "@/modules/reporting/summary";

const s = randomUUID().slice(0, 8);

describe("retenciones recibidas G3", () => {
  it("registra → concilia → aplica; duplicado y exceso bloqueados; resumen la muestra sin netear", async () => {
    const [u] = await db.insert(users).values({ email: `gr-${s}@test.local`, passwordHash: "x", name: "G" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-46${s}-A`, rifOriginal: `J-46${s}-A`, razonSocial: "G3 CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const buy = await createPurchaseDocument(ctx, { partyRif: "J-12121212-1", partyRazon: "Prov", docNumber: "F-1", controlNumber: "C-1", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "1000.00", ivaCausado: "160.00", total: "1160.00", alicuota: "0.16" });
      expect(buy.ok).toBe(true);
      if (!buy.ok) throw new Error("setup");

      const reg = await registerReceived(ctx, {
        agentRif: "J-99999999-9", agentRazon: "Agente R", certificateNumber: "CERT-1",
        fechaComprobante: "2026-09-20", fechaRecepcion: "2026-09-21",
        ivaCausado: "160.00", montoRetenido: "120.00", purchaseDocumentIds: [buy.id],
      });
      expect(reg.ok).toBe(true);
      if (!reg.ok) throw new Error("register");

      const dup = await registerReceived(ctx, {
        agentRif: "J-99999999-9", agentRazon: "Agente R", certificateNumber: "CERT-1",
        fechaComprobante: "2026-09-20", fechaRecepcion: "2026-09-21", montoRetenido: "1.00", purchaseDocumentIds: [],
      });
      expect(dup.ok).toBe(false);

      // aplicar antes de conciliar → bloqueado
      const [per] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id)).limit(1);
      expect((await applyReceived(ctx, reg.id, per!.id)).ok).toBe(false);

      expect((await conciliateReceived(ctx, reg.id, false)).ok).toBe(true);
      expect((await applyReceived(ctx, reg.id, per!.id)).ok).toBe(true);

      expect(await sumAppliedReceived(ctx, per!.id)).toBe("120.00");
      const sum = await getIvaSummary(ctx, per!.id);
      expect(sum.retRecibidasAplicadas).toBe("120.00");
      expect(sum.cuotaPeriodo).toBe("-160.00"); // sin neteo: 0 débito − 160 crédito

      // exceso sobre IVA exige motivo
      const reg2 = await registerReceived(ctx, {
        agentRif: "J-99999999-9", agentRazon: "Agente R", certificateNumber: "CERT-2",
        fechaComprobante: "2026-09-20", fechaRecepcion: "2026-09-21",
        montoRetenido: "500.00", purchaseDocumentIds: [buy.id],
      });
      expect(reg2.ok).toBe(true);
      if (!reg2.ok) throw new Error("setup2");
      expect((await conciliateReceived(ctx, reg2.id, false)).ok).toBe(false);
      expect((await conciliateReceived(ctx, reg2.id, true)).ok).toBe(false); // sin motivo
      expect((await conciliateReceived(ctx, reg2.id, true, "aceptado por contador")).ok).toBe(true);
      expect((await voidReceived(ctx, reg2.id, "prueba")).ok).toBe(true);
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
