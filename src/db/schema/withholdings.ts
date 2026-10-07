import { pgTable, uuid, text, numeric, bigint, date, timestamp, jsonb, unique, index, boolean } from "drizzle-orm/pg-core";
import { daterange } from "./custom";
import { companies } from "./tenancy";
import { parties } from "./parties";
import { fiscalPeriods } from "./periods";
import { purchaseDocuments } from "./fiscal-docs";
import { settlementEvents } from "./sales";

/** Catálogo conceptos ISLR (honorarios, comisiones, alquileres…). company NULL = seed global. */
export const withholdingConcepts = pgTable("withholding_concepts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id"),
  codigo: text("codigo").notNull(),
  nombre: text("nombre").notNull(),
  baseFormulaKind: text("base_formula_kind").notNull(),
  status: text("status").notNull().default("active"),
});

/** Reglas versionadas por vigencia (ADR-004). 75% IVA = seed, no constante. */
export const withholdingRules = pgTable("withholding_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyScopeKey: uuid("company_scope_key").notNull(),
  ruleKind: text("rule_kind").notNull(),
  conceptId: uuid("concept_id").references(() => withholdingConcepts.id),
  effectiveRange: daterange("effective_range").notNull(),
  porcentaje: numeric("porcentaje", { precision: 18, scale: 6 }).notNull(),
  sustraendo: numeric("sustraendo", { precision: 18, scale: 2 }).notNull().default("0"),
  baseFormulaKind: text("base_formula_kind").notNull(),
  conditions: jsonb("conditions"),
  legalReference: text("legal_reference"),
  status: text("status").notNull().default("active"), // createDraft fija 'draft' explícito; el default conserva compatibilidad con seeds e inserts directos
  synthetic: boolean("synthetic").notNull().default(false),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  changeReason: text("change_reason"),
  /** Atajo al RDF que autoriza la regla (ADR-034). Sin .references() para evitar ciclo con ./rdf; FK en SQL. Inmutable desde approved/active. */
  sourceDecisionId: uuid("source_decision_id"),
});

/** Series de numeración por (empresa, sucursal?, tipo, período). Sin huecos vía UPDATE…RETURNING. */
export const documentSeries = pgTable(
  "document_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id"),
    kind: text("kind").notNull(),
    periodKey: text("period_key").notNull(),
    prefix: text("prefix"),
    lastNumber: bigint("last_number", { mode: "number" }).notNull().default(0),
    status: text("status").notNull().default("active"),
  },
  (t) => [unique("uq_series").on(t.companyId, t.branchId, t.kind, t.periodKey)],
);

export const ivaWithholdings = pgTable(
  "iva_withholdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    beneficiaryId: uuid("beneficiary_id")
      .notNull()
      .references(() => parties.id),
    fiscalPeriodId: uuid("fiscal_period_id")
      .notNull()
      .references(() => fiscalPeriods.id),
    certificateNumber: text("certificate_number").notNull(),
    status: text("status").notNull().default("draft"),
    fechaEmision: date("fecha_emision"),
    fechaEntrega: date("fecha_entrega"),
    ruleVersionId: uuid("rule_version_id").references(() => withholdingRules.id),
    ruleSnapshot: jsonb("rule_snapshot").notNull(),
    totalRetained: numeric("total_retained", { precision: 18, scale: 2 }).notNull(),
    issuedBy: uuid("issued_by"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    replacesId: uuid("replaces_id"),
    pdfSha256: text("pdf_sha256"),
    /** 2.0.3 §3.6: el PDF se renderiza DESPUÉS del commit (nunca bloquea la serie). */
    renderStatus: text("render_status").notNull().default("pending"),
    dataSnapshot: jsonb("data_snapshot").notNull(),
  },
  (t) => [
    unique("uq_iva_cert").on(t.companyId, t.certificateNumber),
    index("idx_iva_company_period").on(t.companyId, t.fiscalPeriodId, t.status),
  ],
);

export const ivaWithholdingLines = pgTable("iva_withholding_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  withholdingId: uuid("withholding_id")
    .notNull()
    .references(() => ivaWithholdings.id),
  purchaseDocumentId: uuid("purchase_document_id")
    .notNull()
    .references(() => purchaseDocuments.id),
  invoiceNumber: text("invoice_number").notNull(),
  controlNumber: text("control_number").notNull(),
  taxableBase: numeric("taxable_base", { precision: 18, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 18, scale: 2 }).notNull(),
  retentionRate: numeric("retention_rate", { precision: 18, scale: 6 }).notNull(),
  retainedAmount: numeric("retained_amount", { precision: 18, scale: 2 }).notNull(),
  explanation: jsonb("explanation").notNull(),
});

export const islrWithholdings = pgTable(
  "islr_withholdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    beneficiaryId: uuid("beneficiary_id")
      .notNull()
      .references(() => parties.id),
    fiscalPeriodId: uuid("fiscal_period_id")
      .notNull()
      .references(() => fiscalPeriods.id),
    conceptId: uuid("concept_id").references(() => withholdingConcepts.id),
    settlementEventId: uuid("payment_id").references(() => settlementEvents.id),
    certificateNumber: text("certificate_number").notNull(),
    status: text("status").notNull().default("draft"),
    fechaEmision: date("fecha_emision"),
    ruleVersionId: uuid("rule_version_id").references(() => withholdingRules.id),
    ruleSnapshot: jsonb("rule_snapshot").notNull(),
    totalRetained: numeric("total_retained", { precision: 18, scale: 2 }).notNull(),
    issuedBy: uuid("issued_by"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    replacesId: uuid("replaces_id"),
    renderStatus: text("render_status").notNull().default("pending"),
    dataSnapshot: jsonb("data_snapshot").notNull(),
  },
  (t) => [unique("uq_islr_cert").on(t.companyId, t.certificateNumber)],
);

export const islrWithholdingLines = pgTable("islr_withholding_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  withholdingId: uuid("withholding_id")
    .notNull()
    .references(() => islrWithholdings.id),
  baseSujeta: numeric("base_sujeta", { precision: 18, scale: 2 }).notNull(),
  porcentaje: numeric("porcentaje", { precision: 18, scale: 6 }).notNull(),
  sustraendo: numeric("sustraendo", { precision: 18, scale: 2 }).notNull().default("0"),
  retainedAmount: numeric("retained_amount", { precision: 18, scale: 2 }).notNull(),
  explanation: jsonb("explanation").notNull(),
});
