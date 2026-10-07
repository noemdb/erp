import { pgTable, uuid, text, integer, date, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";
import { companies } from "./tenancy";
import { users } from "./identity";
import { withholdingConcepts, withholdingRules } from "./withholdings";
import { attachments } from "./attachments";

/** Registro de Decisión Fiscal (ADR-034). Firmado = inmutable (trigger rdf_immutable). */
export const fiscalDecisions = pgTable(
  "fiscal_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    codigo: text("codigo").notNull(),
    gap: text("gap").notNull(),
    titulo: text("titulo").notNull(),
    pregunta: text("pregunta").notNull(),
    alternativas: jsonb("alternativas").notNull().$type<{ letra: string; descripcion: string; impacto_numerico?: string }[]>(),
    decision: text("decision"),
    fundamentoNormativo: text("fundamento_normativo"),
    formula: text("formula"),
    redondeoMetodo: text("redondeo_metodo"),
    redondeoEtapa: text("redondeo_etapa"),
    redondeoPrecision: integer("redondeo_precision"),
    momentoFiscal: text("momento_fiscal"),
    ejemploNumerico: jsonb("ejemplo_numerico").notNull().$type<Record<string, string>>().default({}),
    resultadoEsperado: text("resultado_esperado"),
    moneda: text("moneda").notNull().default("VES"),
    ruleKind: text("rule_kind"),
    conceptId: uuid("concept_id").references(() => withholdingConcepts.id),
    vigenciaDesde: date("vigencia_desde"),
    impactoSistema: text("impacto_sistema"),
    status: text("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    supersedesId: uuid("supersedes_id"),
    motivo: text("motivo"),
    firmanteNombre: text("firmante_nombre"),
    firmanteDoc: text("firmante_doc"),
    firmadoPor: uuid("firmado_por").references(() => users.id),
    firmadoEn: timestamp("firmado_en", { withTimezone: true }),
    contentSha256: text("content_sha256"),
    evidenciaAdjuntoId: uuid("evidencia_adjunto_id").references(() => attachments.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_decision_codigo").on(t.companyId, t.codigo),
    index("idx_decisions_company_status").on(t.companyId, t.status),
    index("idx_decisions_company_gap").on(t.companyId, t.gap),
  ],
);

/** Puente N:M decisión↔regla (rol autoriza/aclara/deroga). company_id redundante para RLS. */
export const fiscalDecisionLinks = pgTable(
  "fiscal_decision_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => fiscalDecisions.id),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => withholdingRules.id),
    rol: text("rol").notNull(),
    nota: text("nota"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_decision_link").on(t.decisionId, t.ruleId, t.rol),
    index("idx_decision_links_rule").on(t.companyId, t.ruleId),
    index("idx_decision_links_decision").on(t.companyId, t.decisionId),
  ],
);

/** Secuencia de códigos RDF-YYYY-#### por empresa (patrón ADR-005, serie propia). */
export const rdfSeries = pgTable(
  "rdf_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    year: integer("year").notNull(),
    lastNumber: integer("last_number").notNull().default(0),
  },
  (t) => [unique("uq_rdf_series").on(t.companyId, t.year)],
);
