import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { computeDocumentTaxes, computeIvaWithholding, computeIslrWithholding } from "./compute";

/** Dorados del contador como fixtures (gate F2: 100% verdes). Hoy 1 didáctico; 30–50 pendientes F0. */
const dir = join(__dirname, "..", "..", "..", "fixtures", "tax-scenarios");
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "schema.json");

describe("manifiesto golden", () => {
  it("todo fixture listado en _manifest.json (0 omitidos, 0 extra)", () => {
    const manifest = JSON.parse(readFileSync(join(dir, "_manifest.json"), "utf8")) as { casos: string[] };
    expect([...files].sort()).toEqual([...manifest.casos].sort());
  });
});

describe("escenarios dorados", () => {
  for (const f of files) {
    const s = JSON.parse(readFileSync(join(dir, f), "utf8"));
    it(`${s.id}: ${s.descripcion}`, () => {
      const doc = computeDocumentTaxes(s.doc);
      expect(doc.baseImponible).toBe(s.esperado.baseImponible);
      expect(doc.ivaCausado).toBe(s.esperado.ivaCausado);
      expect(doc.totalValido).toBe(s.esperado.totalValido);
      const iva = computeIvaWithholding({ ...s.iva, ivaCausado: doc.ivaCausado });
      expect(iva.applicable).toBe(true);
      if (iva.applicable) expect(iva.retainedAmount).toBe(s.ivaEsperado.retainedAmount);
      const islr = computeIslrWithholding(s.islr);
      expect(islr.retainedAmount).toBe(s.islrEsperado.retainedAmount);
    });
  }

  it("ISLR con sustraendo mayor a base×% da 0, no negativo", () => {
    const r = computeIslrWithholding({
      baseSujeta: "100.00",
      rule: { ruleVersionId: "t", ruleSnapshot: {}, porcentaje: "0.02", sustraendo: "50.00" },
    });
    expect(r.retainedAmount).toBe("0.00");
  });

  it("empresa no agente → no aplica con motivo", () => {
    const r = computeIvaWithholding({
      company: { agenteRetencionIva: false, agenteRetencionIslr: false },
      counterparty: { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false },
      ivaCausado: "16.00",
      rule: { ruleVersionId: "t", ruleSnapshot: {}, porcentaje: "0.75" },
    });
    expect(r).toEqual({ applicable: false, reason: "EMPRESA_NO_AGENTE" });
  });
});
