import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  computeDocumentTaxes,
  computeIvaWithholding,
  computeIslrWithholding,
} from "@/modules/tax-engine/compute";
import type { FiscalDocInput, CompanyProfile, PartyProfile } from "@/modules/tax-engine/types";
import { verifyGolden } from "./verify";

/**
 * Dorados de contador, respaldados en `fixtures/tax-scenarios/*.json` (fuente de verdad hoy).
 * Fase 3 del spec `blueprint/goldenValidation/`: lista, lee, ejecuta contra el motor y verifica.
 * La firma criptográfica y el respaldo en DB (migraciones 0024-0027) quedan pendientes de ADR-035.
 */
const DIR = join(process.cwd(), "fixtures", "tax-scenarios");

export type GoldenScenario = {
  id: string;
  descripcion: string;
  origen: string;
  estado?: string;
  firma?: {
    firmado_por?: string;
    firmado_por_user_id?: string;
    firmante_doc?: string;
    fecha?: string;
    fuente_legal?: string;
    sha256_contenido?: string;
    algoritmo?: string;
    key_id?: string;
    firmado_en?: string;
  };
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

export type Execution = { pass: boolean; diff?: string; explanation: string[] };

export type CoverageRow = { tipo: string; total: number; firmados: number };

export function tipoDeId(id: string): "iva" | "islr" | "evento_retencion" {
  if (id.startsWith("IVA")) return "iva";
  if (id.startsWith("ISLR")) return "islr";
  return "evento_retencion";
}

function goldenFiles(): string[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "schema.json")
    .sort();
}

export function listGoldenCases(): GoldenScenario[] {
  return goldenFiles().map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as GoldenScenario);
}

export function getGoldenCase(id: string): GoldenScenario | null {
  for (const f of goldenFiles()) {
    const s = JSON.parse(readFileSync(join(DIR, f), "utf8")) as GoldenScenario;
    if (s.id === id) return s;
  }
  return null;
}

/** Ejecuta el escenario contra el motor puro y reporta si reproduce el esperado. */
export function executeGoldenCase(s: GoldenScenario): Execution {
  const explanation: string[] = [];
  const diffs: string[] = [];

  const doc = computeDocumentTaxes(s.doc);
  explanation.push(...doc.explanation);
  if (doc.baseImponible !== s.esperado.baseImponible)
    diffs.push(`base ${doc.baseImponible} ≠ esperado ${s.esperado.baseImponible}`);
  if (doc.ivaCausado !== s.esperado.ivaCausado)
    diffs.push(`IVA causado ${doc.ivaCausado} ≠ esperado ${s.esperado.ivaCausado}`);
  if (doc.totalValido !== s.esperado.totalValido) diffs.push("total no cuadra");

  if (s.iva && s.ivaEsperado) {
    const iva = computeIvaWithholding({ ...s.iva, ivaCausado: doc.ivaCausado });
    if (iva.applicable) explanation.push(...iva.explanation);
    else explanation.push(`IVA no aplica (${iva.reason})`);
    if (s.ivaEsperado.noAplica === true) {
      if (iva.applicable) diffs.push("IVA aplica pero el dorado espera no-aplica");
    } else {
      if (!iva.applicable) diffs.push("IVA no aplica pero el dorado espera que aplique");
      else if (iva.retainedAmount !== s.ivaEsperado.retainedAmount)
        diffs.push(`retención IVA ${iva.retainedAmount} ≠ esperado ${s.ivaEsperado.retainedAmount}`);
    }
  }

  if (s.islr && s.islrEsperado) {
    const islr = computeIslrWithholding(s.islr);
    explanation.push(...islr.explanation);
    if (islr.retainedAmount !== s.islrEsperado.retainedAmount)
      diffs.push(`ISLR ${islr.retainedAmount} ≠ esperado ${s.islrEsperado.retainedAmount}`);
  }

  return { pass: diffs.length === 0, diff: diffs.length > 0 ? diffs.join(" · ") : undefined, explanation };
}

/** Cobertura por tipo de regla: cuántos dorados hay y cuántos están firmados. */
export function coverageByRule(cases: GoldenScenario[]): CoverageRow[] {
  const rows = new Map<string, CoverageRow>();
  for (const c of cases) {
    const tipo = tipoDeId(c.id);
    const row = rows.get(tipo) ?? { tipo, total: 0, firmados: 0 };
    row.total += 1;
    if (verifyGolden(c).firmado) row.firmados += 1;
    rows.set(tipo, row);
  }
  return [...rows.values()];
}
