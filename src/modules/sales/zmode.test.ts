import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, fiscalMachines, zReports, fiscalPeriods,
  salesDocuments, salesDocumentLines, auditEvents,
} from "@/db/schema";
import { getSalesBook } from "./service";
import { setSalesMode } from "@/modules/tenancy/settings";
import { getAutoControls } from "@/modules/reporting/summary";
import { createSalesDocument } from "./service";

const s = randomUUID().slice(0, 8);

describe("G7 modo Z", () => {
  it("libro deriva de Z en modo z; convivencia factura+Z se reporta", async () => {
    const [u] = await db.insert(users).values({ email: `z7-${s}@test.local`, passwordHash: "x", name: "Z" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-48${s}-A`, rifOriginal: `J-48${s}-A`, razonSocial: "Z7 CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const [m] = await db.insert(fiscalMachines).values({ companyId: c!.id, serial: "MF-7" }).returning();
      const [per] = await db.insert(fiscalPeriods).values({ companyId: c!.id, kind: "monthly", range: "[2026-09-01,2026-10-01)", status: "open" }).returning();
      await db.insert(zReports).values({
        companyId: c!.id, machineId: m!.id, fiscalPeriodId: per!.id, fecha: "2026-09-01",
        zNumber: "Z-1", rangeFrom: "1000", rangeTo: "1050", ventasGravadas: "5000.00", ventasExentas: "0.00", iva: "800.00", total: "5800.00",
      });
      const sale = await createSalesDocument(ctx, { partyRif: "J-90909090-9", partyRazon: "Cli", docNumber: "V-1", controlNumber: "VC-1", fechaDocumento: "2026-09-06", fechaFiscal: "2026-09-06", baseImponible: "200.00", ivaCausado: "32.00", total: "232.00", alicuota: "16" });
      expect(sale.ok).toBe(true);

      // modo facturas: solo V-1
      const bookInv = await getSalesBook(ctx, per!.id);
      expect(bookInv.map((r) => r.docNumber)).toEqual(["V-1"]);

      // modo Z: solo el Z con identidad propia
      expect((await setSalesMode(ctx, "z")).ok).toBe(true);
      const bookZ = await getSalesBook(ctx, per!.id);
      expect(bookZ).toHaveLength(1);
      expect(bookZ[0]!.kind).toBe("z_summary");
      expect(bookZ[0]!.total).toBe("5800.00");

      // convivencia factura+Z en el período → hallazgo F8
      const ctrl = await getAutoControls(ctx, per!.id);
      const conv = ctrl.items.find((i) => i.key === "convivencia")!;
      expect(conv.hallazgos.length).toBeGreaterThan(0);
      expect(ctrl.ok).toBe(false);
    } finally {
      const { salesDocumentLines, parties } = await import("@/db/schema");
      const ss = await db.select().from(salesDocuments).where(eq(salesDocuments.companyId, c!.id));
      for (const d of ss) await db.delete(salesDocumentLines).where(eq(salesDocumentLines.documentId, d.id));
      await db.delete(salesDocuments).where(eq(salesDocuments.companyId, c!.id));
      await db.delete(zReports).where(eq(zReports.companyId, c!.id));
      await db.delete(fiscalMachines).where(eq(fiscalMachines.companyId, c!.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
