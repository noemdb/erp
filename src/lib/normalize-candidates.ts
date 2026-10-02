/**
 * S0 (2.0.1 WS2): normaliza candidatos a UN solo contrato de unidades.
 * Motor: porcentaje/alícuota como fracción decimal ("0.75"); candidatos en puntos ("75").
 * Nunca inventa: lo ambiguo va a `advertencias` para el contador. Salida en
 * pendientes/, jamás en fixtures/ (no son dorados).
 */

export type Normalized = {
  id: string;
  tipo: string;
  descripcion: string;
  origen: "candidato";
  estadoOrigen: string;
  porcentaje?: string;
  alicuota?: string;
  base?: string;
  baseGravable?: string;
  sustraendo?: string;
  retencionEsperada?: string;
  advertencias: string[];
  crudo: Record<string, unknown>;
};

/** "75" | "75%" | "0.75" → fracción "0.75". null si ilegible. */
export function toFraction(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const t = String(raw).trim().replace("%", "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  if (n > 1) return String(+(n / 100).toFixed(6));
  return String(n);
}

export function normalizeCandidate(e: Record<string, unknown>): Normalized {
  const advertencias: string[] = [];
  const pctRaw = e.porcentaje ?? e.porcentaje_retencion;
  const porcentaje = pctRaw === undefined ? undefined : toFraction(pctRaw) ?? undefined;
  if (pctRaw !== undefined && porcentaje === undefined) advertencias.push(`porcentaje ilegible: ${pctRaw}`);
  const alicuota = e.alicuota === undefined && e.alicuota_iva === undefined
    ? undefined
    : toFraction(e.alicuota ?? e.alicuota_iva) ?? undefined;
  if ((e.alicuota !== undefined || e.alicuota_iva !== undefined) && alicuota === undefined)
    advertencias.push("alícuota ilegible");
  const base = e.base !== undefined ? String(e.base) : undefined;
  const baseGravable = (e.base_gravable ?? e.base_imponible) !== undefined ? String(e.base_gravable ?? e.base_imponible) : undefined;
  if (base && baseGravable && base !== baseGravable)
    advertencias.push(`INCONSISTENCIA (tipo ISLR-09): base ${base} ≠ base gravable ${baseGravable}; el contador decide cuál usa la fórmula`);
  if (e.estado !== "VALIDADO_CONTADOR") advertencias.push(`sin firma (${e.estado ?? "sin estado"})`);
  return {
    id: String(e.id ?? "?"),
    tipo: String(e.tipo ?? "?"),
    descripcion: String(e.descripcion ?? ""),
    origen: "candidato",
    estadoOrigen: String(e.estado ?? "?"),
    porcentaje,
    alicuota,
    base,
    baseGravable,
    sustraendo: e.sustraendo !== undefined ? String(e.sustraendo) : undefined,
    retencionEsperada: e.retencion_esperada !== undefined ? String(e.retencion_esperada) : undefined,
    advertencias,
    crudo: e,
  };
}
