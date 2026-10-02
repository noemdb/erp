import Decimal from "decimal.js";
import {
  EngineError,
  type FiscalDocInput,
  type DocumentTaxResult,
  type CompanyProfile,
  type PartyProfile,
  type RuleRef,
  type Money,
  type WithholdingResult,
  type NotApplicable,
} from "./types";

/**
 * Redondeo provisional a 2 decimales HALF_UP (G8/ADR-014 pendiente de contador).
 * Toda cifra monetaria de salida pasa por aquí: mismo input → mismo bytes.
 */
export function round2(value: Decimal): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

const GRAVADAS = new Set(["general", "reduced", "additional"]);

/** Inv.1: base + iva (+conceptos permitidos=0 en F1) = total, tolerancia configurable. */
export function computeDocumentTaxes(doc: FiscalDocInput, tolerance: string = "0.01"): DocumentTaxResult {
  const explanation: string[] = [];
  let base = new Decimal(0);
  let iva = new Decimal(0);
  for (const [i, l] of doc.lines.entries()) {
    const b = new Decimal(l.base);
    if (GRAVADAS.has(l.taxCategory)) {
      if (l.taxRate === null) throw new EngineError("RATE_MISSING", `Línea ${i + 1} gravada sin alícuota.`);
      const lineIva = b.times(l.taxRate);
      iva = iva.plus(lineIva);
      base = base.plus(b);
      explanation.push(`Línea ${i + 1}: base ${b.toFixed(2)} × ${(Number(l.taxRate) * 100).toFixed(2)}% = ${round2(lineIva)}`);
    } else {
      explanation.push(`Línea ${i + 1}: ${l.taxCategory} por ${b.toFixed(2)} (sin IVA)`);
    }
  }
  const totalCalculado = round2(base.plus(iva));
  const valido = new Decimal(totalCalculado).minus(doc.total).abs().lte(tolerance);
  explanation.push(`Base ${round2(base)} + IVA ${round2(iva)} = ${totalCalculado} vs total ${doc.total} → ${valido ? "cuadra" : "NO cuadra"}`);
  return { baseImponible: round2(base), ivaCausado: round2(iva), totalCalculado, totalValido: valido, explanation };
}

export type IvaWithholdingInput = {
  company: CompanyProfile;
  counterparty: PartyProfile;
  ivaCausado: Money;
  rule: (RuleRef & { porcentaje: string }) | null;
};

/** IVA retenido = IVA causado × % (DOMAIN). Inv.2: retenido ≤ causado salvo regla explícita. */
export function computeIvaWithholding(input: IvaWithholdingInput): WithholdingResult | NotApplicable {
  const explanation: string[] = [];
  if (!input.company.agenteRetencionIva) return { applicable: false, reason: "EMPRESA_NO_AGENTE" };
  if (!input.counterparty.sujetoRetencionIva) return { applicable: false, reason: "TERCERO_NO_SUJETO" };
  if (!input.rule) return { applicable: false, reason: "SIN_REGLA_VIGENTE" };
  const iva = new Decimal(input.ivaCausado);
  if (iva.lte(0)) return { applicable: false, reason: "SIN_IVA_CAUSADO" };
  const retained = iva.times(input.rule.porcentaje);
  explanation.push(`IVA causado ${input.ivaCausado} × ${(Number(input.rule.porcentaje) * 100).toFixed(2)}% = ${round2(retained)}`);
  if (retained.minus(iva).gt("0.01"))
    throw new EngineError("RETENTION_EXCEEDS_VAT", `IVA retenido ${round2(retained)} excede causado ${input.ivaCausado}.`);
  return { applicable: true, retainedAmount: round2(retained), ruleVersionId: input.rule.ruleVersionId, ruleSnapshot: input.rule.ruleSnapshot, explanation };
}

export type IslrWithholdingInput = {
  baseSujeta: Money;
  rule: RuleRef & { porcentaje: string; sustraendo: Money };
};

/** ISLR = max(0, base × % − sustraendo) (DOMAIN caso límite). */
export function computeIslrWithholding(input: IslrWithholdingInput): WithholdingResult {
  const raw = new Decimal(input.baseSujeta).times(input.rule.porcentaje).minus(input.rule.sustraendo);
  const retained = Decimal.max(0, raw);
  const explanation = [
    `Base ${input.baseSujeta} × ${(Number(input.rule.porcentaje) * 100).toFixed(4)}% − sustraendo ${input.rule.sustraendo} = ${round2(retained)}`,
  ];
  return { applicable: true, retainedAmount: round2(retained), ruleVersionId: input.rule.ruleVersionId, ruleSnapshot: input.rule.ruleSnapshot, explanation };
}

/** Inv.3 pura: una NC no excede el saldo disponible del documento afectado. */
export function puedeAplicarNotaCredito(saldoDisponible: Money, montoNC: Money): boolean {
  return new Decimal(montoNC).lte(new Decimal(saldoDisponible));
}
