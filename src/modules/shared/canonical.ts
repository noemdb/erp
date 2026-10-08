import { createHash } from "node:crypto";

/**
 * Canon único del proyecto (Fase 0.2 del spec `blueprint/goldenValidation/`, cierra el defecto D9).
 *
 * JSON canónico: claves ordenadas recursivamente, arrays en su orden, sin espacios.
 * Misma salida para un objeto independientemente del orden de sus claves.
 *
 * Consumidores: `modules/rdf/canonical`, `modules/rules/activation-gate` y
 * `scripts/validate-goldens`. Un solo canon evita que un hash firmado con uno no
 * verifique con otro (DR-01 de `blueprint/goldenValidation/02-modelo-datos.md`).
 */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}

/** sha256 hex del canon de `v`. Integridad del contenido firmado. */
export function contentHash(v: unknown): string {
  return createHash("sha256").update(canonical(v)).digest("hex");
}

/**
 * Sobre firmado: el hash cubre `contenido`, nunca el bloque `firma` (RG-04, corrige D10).
 * `F` se deja genérico: el algoritmo definitivo se decide en ADR-035 (Fase 1 del spec).
 */
export type SignedEnvelope<T, F = unknown> = { contenido: T; firma: F };
