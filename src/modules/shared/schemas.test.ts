import { describe, expect, it } from "vitest";
import { FraccionSchema, MoneySchema } from "./schemas";

/** Fase 0.4 del spec `blueprint/goldenValidation/`: convención de unidad (fracción, no porcentaje). */
describe("schemas de unidad", () => {
  it("pur-05: FraccionSchema rechaza '16' y acepta '0.16'", () => {
    expect(FraccionSchema.safeParse("16").success).toBe(false);
    expect(FraccionSchema.safeParse("100").success).toBe(false);
    expect(FraccionSchema.safeParse("0.16").success).toBe(true);
    expect(FraccionSchema.safeParse("0.75").success).toBe(true);
    expect(FraccionSchema.safeParse("1.00").success).toBe(true);
    expect(FraccionSchema.safeParse("1.1").success).toBe(false);
  });

  it("pur-06: MoneySchema rechaza número y acepta string con decimales", () => {
    expect(MoneySchema.safeParse(1000).success).toBe(false);
    expect(MoneySchema.safeParse("1000.00").success).toBe(true);
    expect(MoneySchema.safeParse("1000.0").success).toBe(true);
  });
});
