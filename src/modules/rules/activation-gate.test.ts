import { describe, expect, it } from "vitest";
import {
  checkActivationGate,
  gateHash,
  isFirmado,
  type GateRule,
  type GateScenario,
} from "./activation-gate";

/** Escenario firmado en memoria (misma forma que fixtures/tax-scenarios/IVA-01). */
function firmado(overrides: Partial<GateScenario> = {}): GateScenario {
  const base: GateScenario = {
    id: "IVA-T",
    descripcion: "dorado de prueba del gate",
    estado: "VALIDADO_CONTADOR",
    doc: { lines: [{ taxCategory: "general", taxRate: "0.16", base: "1000.00" }], total: "1160.00" },
    esperado: { baseImponible: "1000.00", ivaCausado: "160.00", totalValido: true },
    iva: {
      company: { agenteRetencionIva: true, agenteRetencionIslr: true },
      counterparty: { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: true },
      ivaCausado: "160.00",
      rule: { ruleVersionId: "x", ruleSnapshot: {}, porcentaje: "0.75" },
    },
    ivaEsperado: { retainedAmount: "120.00" },
    ...overrides,
  };
  const { firma: _o, ...sinFirma } = base as GateScenario & { firma?: unknown };
  void _o;
  return { ...base, firma: { sha256_contenido: gateHash(sinFirma) } };
}

function islrFirmado(porcentaje: string, sustraendo: string, retencion: string): GateScenario {
  return firmado({
    id: "ISLR-T",
    doc: { lines: [{ taxCategory: "general", taxRate: "0.16", base: "1000.00" }], total: "1160.00" },
    islr: { baseSujeta: "10000.00", rule: { ruleVersionId: "x", ruleSnapshot: {}, porcentaje, sustraendo } },
    islrEsperado: { retainedAmount: retencion },
  });
}

const iva75: GateRule = { ruleKind: "iva", porcentaje: "0.75", sustraendo: "0", synthetic: false };

/** ACC-03: activar exige reproducir los dorados firmados de la clase. */
describe("gate de activación", () => {
  it("regla 75% reproduce el dorado firmado → activa", () => {
    const g = checkActivationGate(iva75, [firmado()]);
    expect(g).toEqual({ ok: true, corridos: 1 });
  });
  it("regla 80% no reproduce el 75% firmado → bloquea con diff", () => {
    const g = checkActivationGate({ ...iva75, porcentaje: "0.80" }, [firmado()]);
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.code).toBe("GATE_FAILED");
      expect(g.failures?.[0]?.diff).toMatch(/128.00 ≠ esperado 120.00/);
    }
  });
  it("sin cobertura firmada → bloquea (fail-closed), no deja pasar por vacío", () => {
    const g = checkActivationGate(iva75, []);
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.code).toBe("GATE_NO_COVERAGE");
  });
  it("CANDIDATO o firma manipulada no cuentan como cobertura", () => {
    const cand = firmado({ estado: "CANDIDATO" });
    expect(isFirmado(cand)).toBe(false);
    const mut = firmado();
    (mut.ivaEsperado as { retainedAmount: string }).retainedAmount = "999.00";
    expect(isFirmado(mut)).toBe(false);
    expect(checkActivationGate(iva75, [cand, mut]).ok).toBe(false);
  });
  it("ISLR respeta porcentaje y sustraendo de la candidata", () => {
    const rule: GateRule = { ruleKind: "islr", porcentaje: "0.03", sustraendo: "107.50", synthetic: false };
    // 10000×0.03 − 107.50 = 192.50
    expect(checkActivationGate(rule, [islrFirmado("0.03", "107.50", "192.50")])).toEqual({ ok: true, corridos: 1 });
    const g = checkActivationGate(rule, [islrFirmado("0.05", "0.00", "500.00")]);
    expect(g.ok).toBe(false);
  });
  it("synthetic omite el gate (vía de datos de prueba)", () => {
    expect(checkActivationGate({ ...iva75, synthetic: true }, [])).toEqual({
      ok: true, corridos: 0, nota: expect.any(String),
    });
  });
  it("escenario de otra clase no cubre (iva no cubre islr)", () => {
    const g = checkActivationGate({ ruleKind: "islr", porcentaje: "0.02", sustraendo: "0.00", synthetic: false }, [firmado()]);
    if (!g.ok) expect(g.code).toBe("GATE_NO_COVERAGE");
    else throw new Error("debió bloquear por falta de cobertura");
  });
});
