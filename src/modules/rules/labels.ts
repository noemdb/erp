/** Etiquetas es-VE para Fiscal Change Control (ADR-022): borrador→revisión→aprobación→activación. */

export const RULE_KIND_ES: Record<string, string> = {
  iva: "IVA",
  islr: "ISLR",
};

export const RULE_STATUS_ES: Record<string, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobada",
  active: "Activa",
  superseded: "Reemplazada",
};

export type BadgeVariant = "success" | "warning" | "muted" | "outline" | "default" | "secondary" | "destructive";

export const RULE_STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: "outline",
  in_review: "warning",
  approved: "secondary",
  active: "success",
  superseded: "muted",
};

export function es(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}

/** Porcentaje guardado como fracción ("0.75") o entero ("75") → "75 %". */
export function fmtPorcentaje(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  const pct = n > 0 && n < 1 ? n * 100 : n;
  return `${Number(pct.toFixed(4))} %`;
}

export function fmtRange(range: string | null | undefined): string {
  if (!range) return "—";
  const m = /^\[(.*?),(.*?)\)$/.exec(range);
  if (!m) return range;
  const fmt = (iso: string) => {
    const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
    return d ? `${d[3]}-${d[2]}-${d[1]}` : iso.trim();
  };
  const to = (m[2] ?? "").trim();
  return to === "" ? `${fmt(m[1] ?? "")} → vigente` : `${fmt(m[1] ?? "")} → ${fmt(to)}`;
}
