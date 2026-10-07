import { z } from "zod";

export const GAP_VALUES = ["G1", "G2", "G4", "G8", "G9", "ISLR", "OTRO"] as const;
export const DECISION_STATUS = ["draft", "in_review", "approved", "signed", "applied", "returned", "rejected", "superseded"] as const;
export const LINK_ROLES = ["autoriza", "aclara", "deroga"] as const;

const alternativaSchema = z.object({
  letra: z.string().regex(/^[A-C]$/),
  descripcion: z.string().min(10).max(2000),
  impacto_numerico: z.string().max(500).optional(),
});

/** Creación de borrador (Paso 1–2 del wizard): hecho + alternativas. */
export const CreateDecisionSchema = z.object({
  gap: z.enum(GAP_VALUES),
  titulo: z.string().min(5).max(140),
  pregunta: z.string().min(10).max(2000),
  alternativas: z.array(alternativaSchema).min(1).max(3),
  ruleKind: z.enum(["iva", "islr"]).nullable().optional(),
  conceptId: z.string().uuid().nullable().optional(),
  vigenciaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  /** Corrección post-firma: el nuevo RDF cita al que sustituye. */
  supersedesId: z.string().uuid().optional(),
}).superRefine((v, ctx) => {
  if (v.conceptId && v.ruleKind !== "islr") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El concepto solo aplica a ISLR." });
});

/** Edición de borrador (Paso 3): decisión + ejemplo + vigencia. Dinero siempre string. */
export const UpdateDraftSchema = z.object({
  decision: z.string().min(10).max(2000).optional(),
  fundamentoNormativo: z.string().min(10).max(2000).optional(),
  formula: z.string().max(1000).optional(),
  redondeoMetodo: z.enum(["HALF_UP", "HALF_EVEN"]).nullable().optional(),
  redondeoEtapa: z.enum(["por_linea", "por_total"]).nullable().optional(),
  redondeoPrecision: z.number().int().min(0).max(6).nullable().optional(),
  momentoFiscal: z.string().max(500).optional(),
  ejemploNumerico: z.record(z.string().max(200)).optional(),
  resultadoEsperado: z.string().regex(/^\d+\.\d{2}$/, "Formato 0.00").optional(),
  impactoSistema: z.string().max(1000).optional(),
  ruleKind: z.enum(["iva", "islr"]).nullable().optional(),
  conceptId: z.string().uuid().nullable().optional(),
  vigenciaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const MotivoSchema = z.object({ motivo: z.string().min(3).max(500) });

export const SignSchema = z.object({
  firmanteNombre: z.string().min(5).max(140),
  firmanteDoc: z.string().min(5).max(30),
  evidenciaAdjuntoId: z.string().uuid().optional(),
  /** Obligatorio cuando el firmante preparó el borrador y hay otro contador (cuatro-ojos, ADR-020). */
  motivo: z.string().min(3).max(500).optional(),
});

export const LinkSchema = z.object({
  ruleId: z.string().uuid(),
  rol: z.enum(LINK_ROLES),
  nota: z.string().max(500).optional(),
});
