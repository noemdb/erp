import { contentHash } from "../shared/canonical";

export type VerifyResult = { firmado: boolean; error?: string };

/**
 * Verifica la firma de un escenario dorado. Solo `VALIDADO_CONTADOR` cuenta como firmado;
 * el hash cubre el contenido sin el bloque `firma` (misma regla que `scripts/validate-goldens.mjs`).
 * Se acepta cualquier forma de escenario (los fixtures llevan campos extra como `doc`, `esperado`…).
 */
export function verifyGolden(s: { estado?: string; firma?: Record<string, unknown>; [k: string]: unknown }): VerifyResult {
  if (s.estado !== "VALIDADO_CONTADOR") return { firmado: false };
  const { firma, ...sinFirma } = s;
  const hash = contentHash(sinFirma);
  if ((firma?.sha256_contenido as string | undefined) !== hash)
    return { firmado: false, error: `sha256_contenido no coincide con el contenido (esperado ${hash})` };
  return { firmado: true };
}
