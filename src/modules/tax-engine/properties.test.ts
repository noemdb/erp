import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import Decimal from "decimal.js";
import { computeDocumentTaxes, computeIvaWithholding, computeIslrWithholding, puedeAplicarNotaCredito, round2 } from "./compute";

const money = (max: number) =>
  fc.double({ min: 0, max, noNaN: true }).map((n) => new Decimal(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));

describe("invariantes como propiedades (DOMAIN anexo)", () => {
  it("Inv.1: doc calculado con su total siempre cuadra; con +1.00 nunca", () => {
    fc.assert(
      fc.property(fc.array(fc.record({ base: money(100000), rate: fc.constantFrom("0.16", "0.08", "0.31") }), { minLength: 1, maxLength: 5 }), (items) => {
        const lines = items.map((l) => ({ taxCategory: "general" as const, taxRate: l.rate, base: l.base }));
        const iva = items.reduce((a, l) => a.plus(new Decimal(l.base).times(l.rate)), new Decimal(0));
        const base = items.reduce((a, l) => a.plus(l.base), new Decimal(0));
        const total = round2(base.plus(iva));
        expect(computeDocumentTaxes({ lines, total }).totalValido).toBe(true);
        const roto = round2(new Decimal(total).plus(1));
        expect(computeDocumentTaxes({ lines, total: roto }).totalValido).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it("Inv.2: retenido ≤ causado (+0.01) para cualquier IVA y %", () => {
    fc.assert(
      fc.property(money(100000), fc.double({ min: 0, max: 1, noNaN: true }).map((n) => n.toFixed(4)), (iva, pct) => {
        const r = computeIvaWithholding({
          company: { agenteRetencionIva: true, agenteRetencionIslr: false },
          counterparty: { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false },
          ivaCausado: iva,
          rule: { ruleVersionId: "t", ruleSnapshot: {}, porcentaje: pct },
        });
        if (new Decimal(iva).lte(0)) expect(r.applicable).toBe(false);
        else if (r.applicable) expect(new Decimal(r.retainedAmount).minus(iva).lte("0.01")).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it("Inv.3: NC ≤ saldo aplica, NC > saldo no; igualdad sí", () => {
    fc.assert(
      fc.property(money(100000), money(100000), (saldo, nc) => {
        const ok = puedeAplicarNotaCredito(saldo, nc);
        expect(ok).toBe(new Decimal(nc).lte(new Decimal(saldo)));
      }),
      { numRuns: 300 },
    );
    expect(puedeAplicarNotaCredito("116.00", "116.00")).toBe(true);
  });

  it("ISLR: 0 ≤ retenido ≤ base×% y determinista byte a byte", () => {
    fc.assert(
      fc.property(money(100000), fc.double({ min: 0, max: 0.35, noNaN: true }).map((n) => n.toFixed(4)), money(5000), (base, pct, sust) => {
        const in_ = { baseSujeta: base, rule: { ruleVersionId: "t", ruleSnapshot: {}, porcentaje: pct, sustraendo: sust } };
        const a = computeIslrWithholding(in_);
        const b = computeIslrWithholding(in_);
        expect(a.retainedAmount).toBe(b.retainedAmount);
        expect(new Decimal(a.retainedAmount).gte(0)).toBe(true);
        expect(new Decimal(a.retainedAmount).lte(new Decimal(base).times(pct).plus("0.01"))).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});
