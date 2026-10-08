/** Etiquetas es-VE para dorados (blueprint/goldenValidation). */

export const GOLDEN_TIPO_ES: Record<string, string> = {
  iva: "IVA",
  islr: "ISLR",
  evento_retencion: "Evento de retención",
};

export const GOLDEN_ORIGEN_ES: Record<string, string> = {
  real: "Real",
  real_anonimizado: "Real anonimizado",
  sintetico: "Sintético",
};

export const GOLDEN_ESTADO_ES: Record<string, string> = {
  CANDIDATO: "Candidato",
  VALIDADO_CONTADOR: "Validado por contador",
};

export type BadgeVariant = "success" | "warning" | "muted" | "outline" | "default" | "secondary" | "destructive";

export const GOLDEN_ESTADO_VARIANT: Record<string, BadgeVariant> = {
  CANDIDATO: "outline",
  VALIDADO_CONTADOR: "success",
};

export function es(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}
