/** Huecos del correlativo: puro, sin DB ni env (testeable en CI sin Neon). */

export type CorrelativoRow = { certificateNumber: string; status: string; totalRetained: string };

/** Parte un certificado en prefijo + secuencia (`202601` + `00000001`). null si no calza. */
export function certSeq(cert: string, seqLen: 8 | 6): { prefix: string; seq: number } | null {
  const m = new RegExp(`^(.*)(\\d{${seqLen}})$`).exec(cert.trim());
  if (!m || m[1] === undefined || m[2] === undefined) return null;
  const seq = Number(m[2]);
  return Number.isSafeInteger(seq) ? { prefix: m[1], seq } : null;
}

export type CorrelativoGroup = {
  prefix: string;
  emitidos: number;
  desde: string;
  hasta: string;
  maxSeq: number;
  faltantes: string[];
};

export type CorrelativoGaps = {
  total: number;
  groups: CorrelativoGroup[];
  faltantesTotal: number;
  /** Certificados que no calzan el formato (se informan, no se ignoran en silencio). */
  noComparables: string[];
};

/** Huecos por prefijo de serie. Anulados cuentan como consumidos (no son huecos). */
export function findCorrelativoGaps(rows: CorrelativoRow[], seqLen: 8 | 6): CorrelativoGaps {
  const byPrefix = new Map<string, number[]>();
  const noComparables: string[] = [];
  for (const r of rows) {
    const parts = certSeq(r.certificateNumber, seqLen);
    if (!parts) {
      noComparables.push(r.certificateNumber);
      continue;
    }
    const acc = byPrefix.get(parts.prefix) ?? [];
    if (!acc.includes(parts.seq)) acc.push(parts.seq);
    byPrefix.set(parts.prefix, acc);
  }
  const pad = (n: number) => String(n).padStart(seqLen, "0");
  const groups: CorrelativoGroup[] = [...byPrefix.entries()].map(([prefix, seqs]) => {
    const sorted = [...seqs].sort((a, b) => a - b);
    const min = sorted[0] as number;
    const max = sorted[sorted.length - 1] as number;
    const have = new Set(sorted);
    const faltantes: string[] = [];
    for (let n = min; n <= max; n += 1) if (!have.has(n)) faltantes.push(`${prefix}${pad(n)}`);
    return { prefix, emitidos: sorted.length, desde: `${prefix}${pad(min)}`, hasta: `${prefix}${pad(max)}`, maxSeq: max, faltantes };
  });
  groups.sort((a, b) => (a.prefix < b.prefix ? -1 : 1));
  return { total: rows.length, groups, faltantesTotal: groups.reduce((a, g) => a + g.faltantes.length, 0), noComparables };
}
