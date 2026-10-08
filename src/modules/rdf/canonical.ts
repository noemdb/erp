import { contentHash } from "@/modules/shared/canonical";

/** Canónico JSON estable respaldado por el canon único del proyecto (Fase 0.2, cierra D9). */
export { canonical as rdfCanonical, contentHash as rdfHash } from "@/modules/shared/canonical";

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
  return contentHash(c);
}
