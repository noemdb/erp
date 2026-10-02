/** Etiquetas es-VE del tablero de plazos (1.0.2): alertas que no mutan estado fiscal. */

export const KIND_ES: Record<string, string> = {
  iva: "IVA",
  islr: "ISLR",
  iva_entrega: "Entrega IVA",
  islr_entrega: "Entrega ISLR",
};

export const STATE_ES: Record<string, string> = {
  sin_regla: "Sin regla",
  dentro: "Dentro de plazo",
  proximo: "Próximo",
  hoy: "Vence hoy",
  vencido: "Vencido",
  entregado: "Entregado",
};

export type BadgeVariant = "success" | "warning" | "muted" | "outline" | "default" | "secondary" | "destructive";

export const STATE_VARIANT: Record<string, BadgeVariant> = {
  sin_regla: "outline",
  dentro: "success",
  proximo: "warning",
  hoy: "warning",
  vencido: "destructive",
  entregado: "muted",
};

export function es(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}

export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  return d ? `${d[3]}-${d[2]}-${d[1]}` : iso.trim();
}

export function fmtRange(range: string | null | undefined): string {
  if (!range) return "—";
  const m = /^\[(.*?),(.*?)\)$/.exec(range);
  if (!m) return range;
  const to = (m[2] ?? "").trim();
  return to === "" ? `${fmtFecha(m[1])} → vigente` : `${fmtFecha(m[1])} → ${fmtFecha(to)}`;
}
