import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeDocumentTaxes, computeIvaWithholding, computeIslrWithholding } from "./compute";

/** 4.1: garantías estructurales del motor (no dependen del contador). */
describe("garantías del motor", () => {
  it("sin reloj, aleatoriedad, red ni estado externo", () => {
    const src = readFileSync(join(__dirname, "compute.ts"), "utf8");
    for (const banned of ["Date.now", "Math.random", "fetch(", "process.env", "setTimeout"]) {
      expect(src.includes(banned), banned).toBe(false);
    }
  });

  it("todo cálculo trazable: ruleVersionId + snapshot + explicación no vacía", () => {
    const doc = computeDocumentTaxes({ lines: [{ taxCategory: "general", taxRate: "0.16", base: "100.00" }], total: "116.00" });
    expect(doc.explanation.length).toBeGreaterThan(0);
    const iva = computeIvaWithholding({
      company: { agenteRetencionIva: true, agenteRetencionIslr: false },
      counterparty: { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false },
      ivaCausado: doc.ivaCausado,
      rule: { ruleVersionId: "r1", ruleSnapshot: { porcentaje: "0.75" }, porcentaje: "0.75" },
    });
    if (!iva.applicable) throw new Error("setup");
    expect(iva.ruleVersionId).toBe("r1");
    expect(iva.ruleSnapshot).toEqual({ porcentaje: "0.75" });
    expect(iva.explanation.length).toBeGreaterThan(0);
    const islr = computeIslrWithholding({ baseSujeta: "100.00", rule: { ruleVersionId: "r2", ruleSnapshot: {}, porcentaje: "0.02", sustraendo: "0.00" } });
    expect([islr.ruleVersionId, islr.explanation.length]).toEqual(["r2", 1]);
  });

  it("determinista byte a byte (JSON estable)", () => {
    const input = { lines: [{ taxCategory: "general" as const, taxRate: "0.16", base: "333.33" }], total: "386.66" };
    expect(JSON.stringify(computeDocumentTaxes(input))).toBe(JSON.stringify(computeDocumentTaxes(input)));
  });
});
