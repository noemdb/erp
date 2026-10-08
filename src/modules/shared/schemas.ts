import { z } from "zod";

/**
 * Fracción decimal en string (0 a 1) — la convención de unidad del dominio (DR-01):
 * "0.16" no "16", "0.75" no "75". Rechaza valores > 1 (cierra Q-05 / defecto D6).
 */
export const FraccionSchema = z
  .string()
  .regex(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/, "Fracción inválida: usa 0.16, no 16 (entre 0 y 1)");

/** Monto en string con 2 decimales (jamás número). ADR-003: dinero con decimal, nunca float. */
export const MoneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido (usa punto decimal y 2 decimales)");
