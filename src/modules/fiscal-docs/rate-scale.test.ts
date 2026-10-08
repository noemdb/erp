import { describe, expect, it } from "vitest";
import { createPurchaseDocument } from "@/modules/fiscal-docs/service";
import { createSalesDocument } from "@/modules/sales/service";
import { FraccionSchema } from "@/modules/shared/schemas";

/**
 * Q-05 (ENMIENDA E-2, roadmapRev5 A2): la alícuota viaja como fracción 0–1.
 * Se rechaza la escala inválida con RATE_SCALE_INVALID en vez de normalizar
 * en silencio. Estos casos vuelven antes de tocar DB (no requieren Neon).
 */
describe("Q-05 escala única de alícuota (fracción)", () => {
  const compraBase = {
    partyRif: "J-12345678-9",
    partyRazon: "Proveedor X",
    docNumber: "F-RS",
    controlNumber: "C-RS",
    fechaDocumento: "2026-09-05",
    fechaFiscal: "2026-09-05",
    baseImponible: "100.00",
    ivaCausado: "16.00",
    total: "116.00",
  };
  const ctx = { companyId: "00000000-0000-0000-0000-000000000000", userId: "00000000-0000-0000-0000-000000000000" };

  it("rechaza taxRate='16' en línea gravada con RATE_SCALE_INVALID", async () => {
    const res = await createPurchaseDocument(ctx, {
      ...compraBase,
      lines: [{ taxCategory: "general", taxRate: "16", base: "100.00", iva: "16.00" }],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("RATE_SCALE_INVALID");
      expect(res.error.message).toContain("0.16");
    }
  });

  it("rechaza alicuota='16' (entrada plana F1) con RATE_SCALE_INVALID", async () => {
    const res = await createPurchaseDocument(ctx, { ...compraBase, alicuota: "16" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("RATE_SCALE_INVALID");
  });

  it("rechaza alicuota='16' en ventas con RATE_SCALE_INVALID", async () => {
    const res = await createSalesDocument(ctx, { ...compraBase, alicuota: "16" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("RATE_SCALE_INVALID");
  });

  it("FraccionSchema fija la convención: '0.16' sí, '16' no", () => {
    expect(FraccionSchema.safeParse("0.16").success).toBe(true);
    expect(FraccionSchema.safeParse("0").success).toBe(true);
    expect(FraccionSchema.safeParse("16").success).toBe(false);
  });
});
