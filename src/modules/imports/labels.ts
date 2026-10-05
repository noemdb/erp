/** Etiquetas es-VE y variantes Badge para el pipeline de importación (DOMAIN staging). */

export const KIND_ES: Record<string, string> = {
  purchases: "Compras",
  sales: "Ventas",
  iva_withholdings: "Retenciones IVA",
  islr_withholdings: "Retenciones ISLR",
  z_reports: "Reportes Z",
};

export const SOURCE_ES: Record<string, string> = {
  legacy_accounting: "Legacy",
  fiscal_machine: "Máquina fiscal",
  manual: "Manual",
};

export const BATCH_STATUS_ES: Record<string, string> = {
  uploaded: "Subido",
  mapping: "En mapeo",
  validating: "Validando",
  validated: "Validado",
  partially_imported: "Parcial",
  completed: "Completado",
  failed: "Fallido",
};

export type BadgeVariant = "success" | "warning" | "muted" | "outline" | "default" | "secondary" | "destructive";

export const BATCH_STATUS_VARIANT: Record<string, BadgeVariant> = {
  uploaded: "outline",
  mapping: "warning",
  validating: "warning",
  validated: "success",
  partially_imported: "warning",
  completed: "success",
  failed: "destructive",
};

export const ROW_STATUS_ES: Record<string, string> = {
  pending: "Pendiente",
  valid: "Válida",
  warning: "Advertencia",
  rejected: "Rechazada",
  imported: "Importada",
};

export const ROW_STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "outline",
  valid: "success",
  warning: "warning",
  rejected: "destructive",
  imported: "muted",
};

export function es(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}

/** Motivo por el que una columna legacy se registra como ignorada (validate.ts). */
export const IGNORED_COLUMN_MOTIVO: Record<string, string> = {
  alicuota_iva: "alícuota informativa: se deriva iva/base al confirmar",
  aliquota_iva: "alícuota informativa: se deriva iva/base al confirmar",
  alicuota: "alícuota informativa: se deriva iva/base al confirmar",
  aliquota: "alícuota informativa: se deriva iva/base al confirmar",
  fecha_recepcion: "fecha informativa: la fecha fiscal sale de fecha_documento",
};

export function motivoColumna(header: string): string {
  return IGNORED_COLUMN_MOTIVO[header] ?? "columna informativa no consumida por la importación";
}
