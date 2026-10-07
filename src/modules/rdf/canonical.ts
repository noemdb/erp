import { createHash } from "node:crypto";

/** Canónico JSON estable (claves ordenadas, arrays en orden). Espejo del patrón gateCanonical de activation-gate. */
export function rdfCanonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(rdfCanonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v as Record<string, unknown>).sort().map((k) => `${JSON.stringify(k)}:${rdfCanonical((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

export function rdfHash(v: unknown): string {
  return createHash("sha256").update(rdfCanonical(v)).digest("hex");
}

/** Contenido fiscal que cubre la firma (sin metadatos de firma ni auditoría). */
export type SignedContent = {
  codigo: string;
  gap: string;
  titulo: string;
  pregunta: string;
  alternativas: { letra: string; descripcion: string; impacto_numerico?: string }[];
  decision: string;
  fundamento_normativo: string;
  formula?: string | null;
  redondeo_metodo?: string | null;
  redondeo_etapa?: string | null;
  redondeo_precision?: number | null;
  momento_fiscal?: string | null;
  ejemplo_numerico: Record<string, string>;
  resultado_esperado: string;
  moneda: string;
  rule_kind?: string | null;
  concept_id?: string | null;
  vigencia_desde?: string | null;
  impacto_sistema?: string | null;
};

export function signedContentHash(c: SignedContent): string {
  return rdfHash(c);
}
