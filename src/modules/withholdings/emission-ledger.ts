import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * 2.0.5 §5.3: registro externo y append-only de emisiones (número, fecha,
 * sha256, empresa) fuera de la base. Tras un restore se reconcilia
 * document_series contra este registro antes de reabrir la emisión.
 */
export type EmissionEntry = {
  companyId: string;
  kind: "iva_withholding" | "islr_withholding";
  certificateNumber: string;
  fechaEmision: string;
  sha256: string;
  at: string;
};

function ledgerPath(): string {
  const dir = process.env.EMISSION_LEDGER_DIR ?? "./storage/ledger";
  mkdirSync(dir, { recursive: true });
  return join(dir, "emissions.jsonl");
}

export function appendEmission(e: Omit<EmissionEntry, "at">): EmissionEntry {
  const entry = { ...e, at: new Date().toISOString() };
  appendFileSync(ledgerPath(), JSON.stringify(entry) + "\n");
  return entry;
}

export function readLedger(): EmissionEntry[] {
  const p = ledgerPath();
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as EmissionEntry);
}

/** Secuencia numérica del certificado: IVA `AAAAMMSSSSSSSS` → últimos 8; si no, dígitos finales. */
export function certSeq(certificateNumber: string): number {
  const cert = certificateNumber.trim();
  const iva = /^(\d{6})(\d{8})$/.exec(cert);
  const raw = iva ? iva[2]! : (/(\d+)$/.exec(cert)?.[1] ?? "");
  const n = raw === "" ? 0 : Number(raw);
  return Number.isInteger(n) ? n : 0;
}

/** Máximo número emitido por (empresa, tipo, período) según el registro externo. */
export function maxEmitted(companyId: string, kind: string, periodKey: string): number {
  let max = 0;
  for (const e of readLedger()) {
    if (e.companyId === companyId && e.kind === kind && e.certificateNumber.includes(periodKey)) {
      const n = certSeq(e.certificateNumber);
      if (n > max) max = n;
    }
  }
  return max;
}
