import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, fiscalPeriods, auditEvents } from "@/db/schema";
import { sendToReview, closePeriod, reopenPeriod } from "./service";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";

const s = randomUUID().slice(0, 8);

describe("períodos", () => {
  it("open→review→closed bloquea compras; reopen→review→closed", async () => {
    const [u] = await db.insert(users).values({ email: `per-${s}@test.local`, passwordHash: "x", name: "P" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-34${s}-A`, rifOriginal: `J-34${s}-A`, razonSocial: "Per CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    const doc = { partyRif: "J-11111111-1", partyRazon: "P1", docNumber: "F-1", controlNumber: "C-1", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "16" };
    try {
      expect((await createPurchaseDocument(ctx, doc)).ok).toBe(true);
      const [per] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id)).limit(1);

      expect((await closePeriod(ctx, per!.id)).ok).toBe(false); // open→closed directo inválido
      expect((await sendToReview(ctx, per!.id)).ok).toBe(true);
      const closed = await closePeriod(ctx, per!.id);
      expect(closed.ok).toBe(true);

      const late = await createPurchaseDocument(ctx, { ...doc, docNumber: "F-2", controlNumber: "C-2" });
      expect(late.ok).toBe(false);
      if (!late.ok) expect(late.error.code).toBe("PERIOD_CLOSED");

      expect((await reopenPeriod(ctx, per!.id, "x")).ok).toBe(false); // motivo corto
      expect((await reopenPeriod(ctx, per!.id, "corrección autorizada")).ok).toBe(true);
      expect((await sendToReview(ctx, per!.id)).ok).toBe(true);
      expect((await closePeriod(ctx, per!.id)).ok).toBe(true);

      const check = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, per!.id)).limit(1);
      expect(check[0]!.closureHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      // Trigger impide DELETE en cerrado: reabrir primero.
      const pers = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      for (const p of pers.filter((x) => x.status === "closed")) await reopenPeriod(ctx, p.id, "limpieza test");
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      const { purchaseDocuments, purchaseDocumentLines, parties } = await import("@/db/schema");
      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
      await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
