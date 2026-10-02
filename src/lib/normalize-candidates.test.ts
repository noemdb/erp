import { describe, expect, it } from "vitest";
import { toFraction, normalizeCandidate } from "./normalize-candidates";

describe("normalización S0", () => {
  it("puntos → fracción, fracción se conserva", () => {
    expect(toFraction("75")).toBe("0.75");
    expect(toFraction("3")).toBe("0.03");
    expect(toFraction("0.75")).toBe("0.75");
    expect(toFraction("16")).toBe("0.16");
    expect(toFraction("no")).toBeNull();
  });

  it("ISLR-09 se marca, no se corrige solo", () => {
    const n = normalizeCandidate({ id: "ISLR-09", tipo: "islr", estado: "PROPUESTO_NO_VALIDADO", base: "1000.00", base_gravable: "900.00", porcentaje: "3" });
    expect(n.porcentaje).toBe("0.03");
    expect(n.advertencias.some((a) => a.includes("INCONSISTENCIA"))).toBe(true);
    expect(n.advertencias.some((a) => a.includes("sin firma"))).toBe(true);
  });
});
