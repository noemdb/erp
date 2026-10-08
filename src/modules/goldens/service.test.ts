import { describe, expect, it } from "vitest";
import { listGoldenCases, executeGoldenCase, coverageByRule, tipoDeId, getGoldenCase } from "./service";
import { verifyGolden } from "./verify";

/** Fase 3 del spec `blueprint/goldenValidation/`: servicio file-backed sobre fixtures/tax-scenarios. */
describe("dorados service", () => {
  it("lista el fixture didáctico IVA-01", () => {
    const cases = listGoldenCases();
    expect(cases.some((c) => c.id === "IVA-01")).toBe(true);
  });

  it("IVA-01 reproduce el esperado y no está firmado", () => {
    const c = getGoldenCase("IVA-01");
    expect(c).not.toBeNull();
    expect(executeGoldenCase(c!).pass).toBe(true);
    expect(verifyGolden(c!).firmado).toBe(false);
  });

  it("tipoDeId mapea el prefijo del id", () => {
    expect(tipoDeId("IVA-01")).toBe("iva");
    expect(tipoDeId("ISLR-07")).toBe("islr");
    expect(tipoDeId("ABONO-01")).toBe("evento_retencion");
  });

  it("coverageByRule suma total y firmados", () => {
    const cov = coverageByRule(listGoldenCases());
    const iva = cov.find((r) => r.tipo === "iva");
    expect(iva).toBeDefined();
    expect(iva!.total).toBeGreaterThan(0);
    expect(iva!.firmados).toBe(0);
  });
});
