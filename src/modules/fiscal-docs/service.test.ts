import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, parties, purchaseDocuments, purchaseDocumentLines, fiscalPeriods, auditEvents } from "@/db/schema";
import { createPurchaseDocument } from "./service";

const s = randomUUID().slice(0, 8);

describe("createPurchaseDocument (esqueleto M1)", () => {
  it("crea doc+línea+período, rechaza duplicado y descuadre", async () => {
    const [u] = await db.insert(users).values({ email: `buy-${s}@test.local`, passwordHash: "x", name: "Buy" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-32${s}-A`, rifOriginal: `J-32${s}-A`, razonSocial: "Buy CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    const base = { partyRif: "J-12345678-9", partyRazon: "Proveedor X", docNumber: "F-1", controlNumber: "C-1", fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00", alicuota: "16" };

    const ok = await createPurchaseDocument(ctx, base);
    expect(ok.ok).toBe(true);

    const dup = await createPurchaseDocument(ctx, base);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe("DUPLICATE_DOCUMENT");

    const bad = await createPurchaseDocument(ctx, { ...base, docNumber: "F-2", controlNumber: "C-2", total: "100.00" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("TOTAL_MISMATCH");

    const book = await (await import("./service")).getPurchaseBook(ctx);
    expect(book).toHaveLength(1);
    expect(book[0]!.total).toBe("116.00");

    // NC sin afectada → MISSING_AFFECTED_DOCUMENT
    const noAff = await createPurchaseDocument(ctx, {
      ...base, kind: "credit_note" as const, docNumber: "NC-0", controlNumber: "NCC-0",
      total: "10.00", baseImponible: "10.00", ivaCausado: "0.00",
    });
    expect(noAff.ok).toBe(false);
    if (!noAff.ok) expect(noAff.error.code).toBe("MISSING_AFFECTED_DOCUMENT");

    // NC válida contra F-1 (saldo 116.00) y NC que excede
    const affId = ok.ok ? ok.id : "";
    const nc = await createPurchaseDocument(ctx, {
      ...base, kind: "credit_note" as const, docNumber: "NC-1", controlNumber: "NCC-1",
      affectedDocumentId: affId, total: "100.00", baseImponible: "100.00", ivaCausado: "0.00",
    });
    expect(nc.ok).toBe(true);
    const big = await createPurchaseDocument(ctx, {
      ...base, kind: "credit_note" as const, docNumber: "NC-2", controlNumber: "NCC-2",
      affectedDocumentId: affId, total: "200.00", baseImponible: "200.00", ivaCausado: "0.00",
    });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error.code).toBe("CREDIT_NOTE_EXCEEDS_BALANCE");

    // Multilínea con exento: 100 gravada + 16 IVA + 50 exenta = 166.00
    const multi = await createPurchaseDocument(ctx, {
      partyRif: "J-12345678-9", partyRazon: "Proveedor X", docNumber: "F-3", controlNumber: "C-3",
      fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", total: "166.00",
      lines: [
        { taxCategory: "general" as const, taxRate: "16", base: "100.00", iva: "16.00" },
        { taxCategory: "exempt" as const, taxRate: null, base: "50.00", iva: "0.00" },
      ],
    });
    expect(multi.ok).toBe(true);

    // Línea exenta con IVA → rechazo
    const badEx = await createPurchaseDocument(ctx, {
      partyRif: "J-12345678-9", partyRazon: "Proveedor X", docNumber: "F-4", controlNumber: "C-4",
      fechaDocumento: "2026-09-05", fechaFiscal: "2026-09-05", total: "116.00",
      lines: [{ taxCategory: "exempt" as const, taxRate: null, base: "100.00", iva: "16.00" }],
    });
    expect(badEx.ok).toBe(false);

    // cleanup (audit primero: FK a company)
    const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
    for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
    await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, c!.id));
    await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
    await db.delete(parties).where(eq(parties.companyId, c!.id));
    await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, c!.id));
    await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
    await db.delete(companies).where(eq(companies.id, c!.id));
    await db.delete(users).where(eq(users.id, u!.id));
  });
});
