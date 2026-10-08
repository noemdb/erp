import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, parties, purchaseDocuments, purchaseDocumentLines,
  fiscalPeriods, auditEvents,
} from "@/db/schema";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { sendToReview, closePeriod, reopenPeriod } from "./service";
import { getCloseChecklist } from "./checklist";

const s = randomUUID().slice(0, 8);

describe("cierre a dos niveles (F6)", () => {
  it("trigger DB rechaza mutación en cerrado; checklist detecta pendientes", async () => {
    const [u] = await db.insert(users).values({ email: `cl-${s}@test.local`, passwordHash: "x", name: "C" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-44${s}-A`, rifOriginal: `J-44${s}-A`, razonSocial: "Cl CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    let periodId = "";
    try {
      const buy = await createPurchaseDocument(ctx, { partyRif: "J-99999999-9", partyRazon: "Prov", docNumber: "F-1", controlNumber: "C-1", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "0.16" });
      expect(buy.ok).toBe(true);
      const [per] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id)).limit(1);
      periodId = per!.id;
      await sendToReview(ctx, per!.id);
      await closePeriod(ctx, per!.id);

      // Nivel DB: update directo revienta aunque la app lo intentara
      await expect(
        db.update(purchaseDocuments).set({ total: "999.99" }).where(eq(purchaseDocuments.companyId, c!.id)),
      ).rejects.toThrow(/PERIOD_CLOSED/);

      const check = await getCloseChecklist(ctx, per!.id);
      expect(check.items.find((i) => i.key === "documentos")!.ok).toBe(true);
      // sin versiones congeladas → no listo (reportes pendientes)
      expect(check.ready).toBe(false);
      expect(check.items.find((i) => i.key === "reportes")!.ok).toBe(false);
    } finally {
      // El trigger impide DELETE en cerrado: reabrir primero (igual que en producción).
      if (periodId) await reopenPeriod(ctx, periodId, "limpieza test");
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
