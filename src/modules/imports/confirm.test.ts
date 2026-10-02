import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users, companies, companyUser, sourceFiles, importBatches, importRows,
  purchaseDocuments, parties, fiscalPeriods, fiscalMachines, zReports, auditEvents,
} from "@/db/schema";
import { uploadImport } from "./service";
import { validateBatch } from "./validate";
import { confirmImport, rejectedCsv } from "./confirm";

const s = randomUUID().slice(0, 8);
const corpus = (f: string) => readFileSync(join(__dirname, "..", "..", "..", "fixtures", "csv-corpus", f));

async function setup() {
  const [u] = await db.insert(users).values({ email: `cf-${s}@test.local`, passwordHash: "x", name: "C" }).returning({ id: users.id });
  const [c] = await db.insert(companies).values({ rif: `J-39${s}-A`, rifOriginal: `J-39${s}-A`, razonSocial: "Cf CA", condicionIva: "ordinario" }).returning({ id: companies.id });
  await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
  return { u: u!, c: c! };
}

async function cleanup(cId: string, uId: string) {
  const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, cId));
  const { purchaseDocumentLines } = await import("@/db/schema");
  for (const d of docs) await db.delete(purchaseDocumentLines).where(eq(purchaseDocumentLines.documentId, d.id));
  await db.delete(purchaseDocuments).where(eq(purchaseDocuments.companyId, cId));
  await db.delete(zReports).where(eq(zReports.companyId, cId));
  await db.delete(fiscalMachines).where(eq(fiscalMachines.companyId, cId));
  await db.delete(parties).where(eq(parties.companyId, cId));
  await db.delete(fiscalPeriods).where(eq(fiscalPeriods.companyId, cId));
  const batches = await db.select().from(importBatches).where(eq(importBatches.companyId, cId));
  for (const b of batches) await db.delete(importRows).where(eq(importRows.batchId, b.id));
  await db.delete(importBatches).where(eq(importBatches.companyId, cId));
  await db.delete(sourceFiles).where(eq(sourceFiles.companyId, cId));
  await db.delete(auditEvents).where(eq(auditEvents.companyId, cId));
  await db.delete(companyUser).where(eq(companyUser.companyId, cId));
  await db.delete(companies).where(eq(companies.id, cId));
  await db.delete(users).where(eq(users.id, uId));
}

describe("confirmación", () => {
  it("compras: válidas+advertencias → docs con trazabilidad; reintento no duplica; rechazadas.csv", async () => {
    const { u, c } = await setup();
    const ctx = { companyId: c.id, userId: u.id };
    try {
      const tagged = Buffer.concat([corpus("compras-legacy.csv"), Buffer.from(`10/09/2026;J-99999999-9;Varios;F-${s};C-${s};1,00;0,16;1,16\n`)]);
      const up = await uploadImport(ctx, { kind: "purchases", sourceSystem: "legacy_accounting", originalName: "c.csv" }, tagged);
      expect(up.ok).toBe(true);
      if (!up.ok) throw new Error("setup");
      expect((await validateBatch(ctx, up.batchId)).ok).toBe(true);

      const r1 = await confirmImport(ctx, up.batchId);
      expect(r1.ok).toBe(true);
      if (!r1.ok) throw new Error("setup confirm");
      expect(r1.created).toBe(3);
      expect(r1.rejected).toBe(3);

      const docs = await db.select().from(purchaseDocuments).where(eq(purchaseDocuments.companyId, c.id));
      expect(docs).toHaveLength(3);
      expect(docs.every((d) => d.sourceFileId && d.importBatchId === up.batchId && d.sourceRowNumber)).toBe(true);

      const r2 = await validateBatch(ctx, up.batchId);
      expect(r2.ok).toBe(true);
      const r3 = await confirmImport(ctx, up.batchId);
      expect(r3.ok).toBe(true);
      if (!r3.ok) throw new Error("setup reconfirm");
      expect(r3.created).toBe(0); // idempotente: las importadas se conservan y se saltan
      expect(r3.skipped).toBe(3);

      const csv = await rejectedCsv(ctx, up.batchId);
      expect(csv.ok && csv.csv.split("\n").length).toBe(4); // header + 3
    } finally {
      await cleanup(c.id, u.id);
    }
  });

  it("z_reports: valida y confirma 2 Z con máquina auto-creada", async () => {
    const { u, c } = await setup();
    const ctx = { companyId: c.id, userId: u.id };
    // rif distinto para no chocar con el otro test (misma compañía no, compañía nueva por setup)
    try {
      const up = await uploadImport(ctx, { kind: "z_reports", sourceSystem: "fiscal_machine", originalName: "z.csv" }, corpus("z-maquina.csv"));
      expect(up.ok).toBe(true);
      if (!up.ok) throw new Error("setup");
      const v = await validateBatch(ctx, up.batchId);
      expect(v.ok && v.rejected).toBe(0);
      const r = await confirmImport(ctx, up.batchId);
      expect(r.ok && r.created).toBe(2);
      const zs = await db.select().from(zReports).where(eq(zReports.companyId, c.id));
      expect(zs).toHaveLength(2);
    } finally {
      await cleanup(c.id, u.id);
    }
  });
});
