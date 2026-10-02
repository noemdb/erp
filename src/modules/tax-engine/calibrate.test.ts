import { describe, expect, it } from "vitest";
import { ALL_COMBOS, calibrate, comboName, computeIvaCalib } from "./calibrate";

describe("calibración G8", () => {
  it("8 combinaciones y caso que discrimina etapa", () => {
    expect(ALL_COMBOS).toHaveLength(8);
    // 3 líneas de 33.33 al 16%: por línea 3×5.33=15.99; exacto 15.9984→16.00
    const lines = [
      { base: "33.33", rate: "0.16" },
      { base: "33.33", rate: "0.16" },
      { base: "33.33", rate: "0.16" },
    ];
    expect(computeIvaCalib(lines, { precision: "exact", stage: "line", mode: "HALF_UP" }).totalIva).toBe("15.99");
    expect(computeIvaCalib(lines, { precision: "exact", stage: "document", mode: "HALF_UP" }).totalIva).toBe("16.00");
    const table = calibrate([{ id: "D1", lines, legacyTotalIva: "16.00" }]);
    expect(table.find((r) => r.combo === comboName({ precision: "exact", stage: "document", mode: "HALF_UP" }))!.docsConDiff).toBe(0);
    expect(table.find((r) => r.combo === comboName({ precision: "exact", stage: "line", mode: "HALF_UP" }))!.docsConDiff).toBe(1);
  });
});
