import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, sourceFiles, importBatches, importRows, auditEvents } from "@/db/schema";
import { uploadImport } from "./service";
import { validateBatch } from "./validate";
import { normalizeDecimal, normalizeDate, detectSeparator, parseCsv } from "./parse";

const s = randomUUID().slice(0, 8);

describe("parser", () => {
  it("coma/punto decimal, BOM, fechas y nulos", () => {
    expect(normalizeDecimal("1.234,56")).toBe("1234.56");
    expect(normalizeDecimal("1,234.56")).toBe("1234.56");
    expect(normalizeDecimal("100,00")).toBe("100.00");
    expect(normalizeDecimal("N/A")).toBeNull();
    expect(normalizeDecimal("0")).toBe("0");
    expect(normalizeDate("05/09/2026")).toBe("2026-09-05");
    expect(normalizeDate("2026-09-05")).toBe("2026-09-05");
    expect(normalizeDate("99/99/2026")).toBeNull();
    expect(detectSeparator("a;b;c")).toBe(";");
    const bom = parseCsv(Buffer.from("\uFEFFa,b\n1,2\n", "utf8"));
    expect(bom.headers).toEqual(["a", "b"]);
  });
});

describe("alias legacy casoUso003 + avisos", () => {
  it("monto_iva/total_factura resuelven; NC se rechaza; abono≠0 avisa; alicuota queda en ignoredColumns", async () => {
    const [u] = await db.insert(users).values({ email: `cu3-${s}@test.local`, passwordHash: "x", name: "C3" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-40${s}-A`, rifOriginal: `J-40${s}-A`, razonSocial: "CU3 CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const bytes = Buffer.from(
        [
          "fecha_documento,fecha_recepcion,rif_proveedor,razon_social,numero_factura,numero_control,base_imponible,alicuota_iva,iva,total,tipo_doc,abono_en_cuenta",
          "2023-09-01,2023-09-02,J-12345678-9,INSUMOS CARACAS C.A.,001-00001,12345,1000.00,16,160.00,1160.00,F,0.00",
          "2023-09-05,2023-09-06,J-11122233-4,SERVICIOS GLOBALES,004-00099,11122,3000.00,16,480.00,3480.00,F,1500.00",
          "2023-09-10,2023-09-11,J-12345678-9,INSUMOS CARACAS C.A.,001-00004,12348,100.00,16,16.00,116.00,NC,0.00",
          "2023-09-08,2023-09-09,XXX,MALO,006-00005,77788,800.00,16,128.00,928.00,F,0.00",
          "2023-09-12,2023-09-13,J-98765432-1,PAPELERIA CENTRAL,002-00046,98766,1200.00,16,192.00,1300.00,F,0.00",
        ].join("\n"),
        "utf8",
      );
      const up = await uploadImport(ctx, { kind: "purchases", sourceSystem: "legacy_accounting", originalName: "casoUso003.csv" }, bytes);
      expect(up.ok).toBe(true);
      if (!up.ok) throw new Error("setup");
      const res = await validateBatch(ctx, up.batchId);
      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("setup validate");
      expect(res.total).toBe(5);
      expect(res.rejected).toBe(3); // NC + RIF malo + descuadre
      expect(res.warning).toBe(2); // tercero nuevo + abono con aviso
      expect(res.valid).toBe(0);

      const rows = await db.select().from(importRows).where(eq(importRows.batchId, up.batchId));
      const byNum = new Map(rows.map((r) => [r.rowNumber, r]));
      expect(JSON.stringify(byNum.get(3)?.errors)).toContain("tipo_doc 'NC'");
      expect(JSON.stringify(byNum.get(2)?.errors)).toContain("aviso: abono_en_cuenta 1500");
      expect(byNum.get(2)?.status).toBe("warning");
      // La fila con abono conserva normalizado: confirmar no debe romperse
      expect(byNum.get(2)?.normalized).not.toBeNull();

      const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, up.batchId));
      const profile = batch?.mappingProfile as { ignoredColumns?: string[] } | null;
      expect(profile?.ignoredColumns).toContain("alicuota_iva");
      expect(profile?.ignoredColumns).toContain("fecha_recepcion");
    } finally {
      const batches = await db.select().from(importBatches).where(eq(importBatches.companyId, c!.id));
      for (const b of batches) await db.delete(importRows).where(eq(importRows.batchId, b.id));
      await db.delete(importBatches).where(eq(importBatches.companyId, c!.id));
      await db.delete(sourceFiles).where(eq(sourceFiles.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
describe("validación por fila", () => {
  it("1 válida, 2 advertencia (tercero nuevo), 1 RIF malo, 1 dup archivo, 1 descuadre", async () => {
    const [u] = await db.insert(users).values({ email: `val-${s}@test.local`, passwordHash: "x", name: "V" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-38${s}-A`, rifOriginal: `J-38${s}-A`, razonSocial: "Val CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const bytes = readFileSync(join(__dirname, "..", "..", "..", "fixtures", "csv-corpus", "compras-legacy.csv"));
      // hash distinto por run para no chocar con idempotencia de otros runs
      const tagged = Buffer.concat([bytes, Buffer.from(`\n10/09/2026;J-99999999-9;X;F-${s};C-${s};1,00;0,16;1,16\n`)]);
      const up = await uploadImport(ctx, { kind: "purchases", sourceSystem: "legacy_accounting", originalName: "compras.csv" }, tagged);
      expect(up.ok).toBe(true);
      if (!up.ok) throw new Error("setup");
      const res = await validateBatch(ctx, up.batchId);
      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("setup validate");
      expect(res.total).toBe(6);
      expect(res.rejected).toBe(3); // RIF malo + dup archivo + descuadre
      expect(res.warning).toBe(3); // 3 terceros nuevos (filas 1, 2 y 6)
      expect(res.valid).toBe(0);
      const rej = await db.select().from(importRows).where(eq(importRows.batchId, up.batchId));
      expect(rej.filter((r) => r.status === "rejected")).toHaveLength(3);
    } finally {
      const batches = await db.select().from(importBatches).where(eq(importBatches.companyId, c!.id));
      for (const b of batches) await db.delete(importRows).where(eq(importRows.batchId, b.id));
      await db.delete(importBatches).where(eq(importBatches.companyId, c!.id));
      await db.delete(sourceFiles).where(eq(sourceFiles.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
