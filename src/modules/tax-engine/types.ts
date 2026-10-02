/** Contrato motor puro (ROADMAP §5, ADR-004). Sin DB/red/reloj. Dinero = string decimal. */

export type Money = string;

export type TaxCategory =
  | "general"
  | "reduced"
  | "additional"
  | "exempt"
  | "no_subject"
  | "no_credit";

export type TaxLineInput = {
  taxCategory: TaxCategory;
  /** Alícuota en fracción ("0.16") o null si exenta/no sujeta. */
  taxRate: string | null;
  base: Money;
};

export type FiscalDocInput = { lines: TaxLineInput[]; total: Money };

export type CompanyProfile = { agenteRetencionIva: boolean; agenteRetencionIslr: boolean };

export type PartyProfile = {
  tipoPersona: "natural" | "juridica";
  residente: boolean;
  sujetoRetencionIva: boolean;
  sujetoRetencionIslr: boolean;
};

export type RuleRef = { ruleVersionId: string; ruleSnapshot: Record<string, unknown> };

export type DocumentTaxResult = {
  baseImponible: Money;
  ivaCausado: Money;
  /** Suma verificada base+iva (Inv.1). */
  totalCalculado: Money;
  totalValido: boolean;
  explanation: string[];
};

export type WithholdingResult = {
  applicable: true;
  retainedAmount: Money;
  ruleVersionId: string;
  ruleSnapshot: Record<string, unknown>;
  explanation: string[];
};

export type NotApplicable = { applicable: false; reason: string };

export class EngineError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
