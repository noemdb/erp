import { createHash } from "node:crypto";

/**
 * S0 (2.0.1 WS3B): anonimización determinista para muestras reales.
 * Misma entrada + misma sal → mismo reemplazo (conserva relaciones y
 * duplicados); importes, fechas y totales intactos. La sal NUNCA entra al
 * repo: via ANON_SALT. RIF sintéticos con formato válido J-/V-/E-/G-.
 */
function digest(salt: string, scope: string, value: string): string {
  return createHash("sha256").update(`${salt}|${scope}|${value}`).digest("hex");
}

export function anonRif(salt: string, rif: string): string {
  const h = digest(salt, "rif", rif.toUpperCase());
  const letter = "JVE"[Number.parseInt(h.slice(0, 2), 16) % 3]!;
  const num = String(10000000 + (Number.parseInt(h.slice(2, 10), 16) % 89999999));
  return `${letter}-${num}-${h.slice(10, 11)}`;
}

export function anonRazon(salt: string, razon: string): string {
  return `TERCERO-${digest(salt, "razon", razon).slice(0, 8).toUpperCase()}`;
}

export function anonDireccion(salt: string, dir: string): string {
  return `DIRECCIÓN-${digest(salt, "dir", dir).slice(0, 8).toUpperCase()}`;
}

export type PartyRow = { rif: string; razon: string; direccion?: string };

/** Anonimiza tercero preservando igualdad: mismo original → mismo reemplazo. */
export function anonParty(salt: string, p: PartyRow): Required<PartyRow> & { mapa: boolean } {
  if (!salt) throw new Error("ANON_SALT requerida (nunca en el repo)");
  return {
    rif: anonRif(salt, p.rif),
    razon: anonRazon(salt, p.razon),
    direccion: anonDireccion(salt, p.direccion ?? ""),
    mapa: true,
  };
}
