/** Etiquetas es-VE para Decisiones fiscales (ADR-034): borrador→revisión→aprobación→firma→aplicación. */

export const RDF_GAP_ES: Record<string, string> = {
  G1: "G1 · Período",
  G2: "G2 · Abono en cuenta",
  G4: "G4 · Moneda",
  G8: "G8 · Redondeo",
  G9: "G9 · Numeración",
  ISLR: "ISLR · Concepto",
  OTRO: "Otro",
};

/** Descripción larga por tema fiscal (leyenda del formulario y diálogo de ayuda). */
export const RDF_GAP_DESC: Record<string, string> = {
  G1: "Período de IVA de la empresa: mensual o quincenal. Determina los períodos fiscales y el prefijo de numeración.",
  G2: "Momento de la retención: pago o abono en cuenta, lo que ocurra primero. Incluye fecha del evento, parciales y sustraendo.",
  G4: "Moneda y tipo de cambio: base en bolívares, referencia USD y tasa oficial BCV aplicable a la base.",
  G8: "Redondeo del cálculo: método, etapa (por línea o por total) y precisión final en bolívares.",
  G9: "Numeración de comprobantes: formato de serie ISLR y su reinicio, más cotejo del reinicio IVA.",
  ISLR: "Concepto de pago ISLR: base con o sin IVA, porcentaje, UT, mínimos y sustraendo por concepto y beneficiario.",
  OTRO: "Otro tema fiscal no cubierto por los anteriores.",
};

export const RDF_STATUS_ES: Record<string, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobada",
  signed: "Firmada",
  applied: "Aplicada",
  returned: "Devuelta",
  rejected: "Rechazada",
  superseded: "Reemplazada",
};

export type BadgeVariant = "success" | "warning" | "muted" | "outline" | "default" | "secondary" | "destructive";

export const RDF_STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: "outline",
  in_review: "warning",
  approved: "secondary",
  signed: "success",
  applied: "success",
  returned: "warning",
  rejected: "destructive",
  superseded: "muted",
};

export function es(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}
