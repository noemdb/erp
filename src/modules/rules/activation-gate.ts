import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { contentHash } from "@/modules/shared/canonical";
import {
  computeDocumentTaxes,
  computeIvaWithholding,
  computeIslrWithholding,
} from "@/modules/tax-engine/compute";
import type {
  CompanyProfile,
  FiscalDocInput,
  PartyProfile,
} from "@/modules/tax-engine/types";

/**
 * ACC-03: ninguna regla fiscal se activa sin dorados firmados que la respalden.
 * La regla candidata debe REPRODUCIR el 100% de los escenarios firmados de su
 * clase (se sustituyen sus parámetros en el cálculo y el esperado debe seguir
 * dando). Cambiar un % exige firmar dorados nuevos (F0-08), no editar historia.
 *
 * Alcance v1: ejecuta el formato de `fixtures/tax-scenarios` (el mismo que
 * corre en `engine.test.ts`). Los candidatos en formato nuevo
 * (`pendientes/TERCERA_REV/files/`) entran al gate cuando se promuevan a
 * fixtures firmados (F0-07/F0-08), no antes.
 *
 * `synthetic: true` omite el gate (datos de prueba; en prod ni siquiera llegan
 * aquí por la guardia previa). Todo lo no sintético exige cobertura firmada.
 */

export type GateRule = {
  ruleKind: "iva" | "islr";
  porcentaje: string;
  sustraendo: string;
  synthetic: boolean;
};

export type GateScenario = {
  id: string;
  descripcion?: string;
  estado?: string;
  firma?: { sha256_contenido?: string };
  doc: FiscalDocInput;
  esperado: { baseImponible: string; ivaCausado: string; totalValido: boolean };
  iva?: {
    company: CompanyProfile;
    counterparty: PartyProfile;
    ivaCausado: string;
    rule: { ruleVersionId: string; ruleSnapshot: Record<string, unknown>; porcentaje: string };
  };
  ivaEsperado?: { retainedAmount: string; noAplica?: boolean };
  islr?: { baseSujeta: string; rule: { ruleVersionId: string; ruleSnapshot: Record<string, unknown>; porcentaje: string; sustraendo: string } };
  islrEsperado?: { retainedAmount: string };
};

export type GateOk = { ok: true; corridos: number; nota?: string };
export type GateFail = { ok: false; code: "GATE_NO_COVERAGE" | "GATE_FAILED" | "GATE_LOAD_ERROR" | "GATE_NO_RDF"; message: string; failures?: { id: string; diff: string }[] };
export type GateResult = GateOk | GateFail;

/** Canon único del proyecto (Fase 0.2, cierra D9). `gateCanonical`/`gateHash` son el mismo canon que `rdf` y `scripts/validate-goldens`. */
export { canonical as gateCanonical, contentHash as gateHash } from "@/modules/shared/canonical";

/** Solo VALIDADO_CONTADOR con hash íntegro cuenta como firmado. */
export function isFirmado(s: GateScenario): boolean {
  if (s.estado !== "VALIDADO_CONTADOR") return false;
  const { firma, ...sinFirma } = s as GateScenario & { firma?: unknown };
  void firma;
  return (s.firma?.sha256_contenido ?? "") === contentHash(sinFirma);
}

/** Carga los firmados del directorio de fixtures. Lanza GATE_LOAD_ERROR si el dir falla. */
export function loadSignedScenarios(fixtureDir?: string): GateScenario[] {
  const dir = fixtureDir ?? join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "tax-scenarios");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "schema.json");
  } catch (e) {
    throw new Error(`GATE_LOAD_ERROR: no se pudo leer ${dir}: ${(e as Error).message}`);
  }
  const out: GateScenario[] = [];
  for (const f of files) {
    try {
      const s = JSON.parse(readFileSync(join(dir, f), "utf8")) as unknown as GateScenario;
      if (isFirmado(s)) out.push(s);
    } catch {
      throw new Error(`GATE_LOAD_ERROR: fixture corrupto ${f}`);
    }
  }
  return out;
}

function runScenario(s: GateScenario, rule: GateRule): { pass: boolean; diff?: string } {
  const doc = computeDocumentTaxes(s.doc);
  if (doc.baseImponible !== s.esperado.baseImponible || doc.ivaCausado !== s.esperado.ivaCausado || doc.totalValido !== s.esperado.totalValido)
    return { pass: false, diff: "documento no reproduce el esperado (escenario corrupto o motor cambiado)" };
  if (rule.ruleKind === "iva" && s.iva && s.ivaEsperado) {
    const r = computeIvaWithholding({
      company: s.iva.company,
      counterparty: s.iva.counterparty,
      ivaCausado: doc.ivaCausado,
      rule: { ...s.iva.rule, porcentaje: rule.porcentaje },
    });
    if (!r.applicable) {
      if (s.ivaEsperado.noAplica === true) return { pass: true };
      return { pass: false, diff: "IVA no aplica con la regla candidata" };
    }
    if (r.applicable && r.retainedAmount !== s.ivaEsperado.retainedAmount)
      return { pass: false, diff: `IVA ${r.retainedAmount} ≠ esperado ${s.ivaEsperado.retainedAmount}` };
    return { pass: true };
  }
  if (rule.ruleKind === "islr" && s.islr && s.islrEsperado) {
    const r = computeIslrWithholding({
      baseSujeta: s.islr.baseSujeta,
      rule: { ...s.islr.rule, porcentaje: rule.porcentaje, sustraendo: rule.sustraendo },
    });
    if (r.retainedAmount !== s.islrEsperado.retainedAmount)
      return { pass: false, diff: `ISLR ${r.retainedAmount} ≠ esperado ${s.islrEsperado.retainedAmount}` };
    return { pass: true };
  }
  return { pass: false, diff: "escenario sin bloque ejecutable para esta clase de regla" };
}

export function checkActivationGate(rule: GateRule, scenarios: GateScenario[]): GateResult {
  if (rule.synthetic) return { ok: true, corridos: 0, nota: "synthetic: gate no aplica (no activable en producción)" };
  const firmados = scenarios.filter(isFirmado);
  const relevantes = firmados.filter((s) =>
    (rule.ruleKind === "iva" && s.iva && s.ivaEsperado) || (rule.ruleKind === "islr" && s.islr && s.islrEsperado),
  );
  if (relevantes.length === 0)
    return {
      ok: false,
      code: "GATE_NO_COVERAGE",
      message: `Sin dorados firmados que cubran reglas ${rule.ruleKind}: firma escenarios (ACC-02/F0-08) antes de activar.`,
    };
  const failures: { id: string; diff: string }[] = [];
  for (const s of relevantes) {
    const r = runScenario(s, rule);
    if (!r.pass) failures.push({ id: s.id, diff: r.diff ?? "?" });
  }
  if (failures.length > 0)
    return { ok: false, code: "GATE_FAILED", message: `${failures.length}/${relevantes.length} dorados no reproducidos por la regla candidata.`, failures };
  return { ok: true, corridos: relevantes.length };
}
