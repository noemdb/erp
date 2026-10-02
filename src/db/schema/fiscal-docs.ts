import { pgTable, uuid, text, numeric, date, timestamp, integer, unique, index } from "drizzle-orm/pg-core";
import { companies } from "./tenancy";
import { parties } from "./parties";
import { fiscalPeriods } from "./periods";

/** Subconjunto F1-4b (M1). Campos FX/void/replaces/source llegan en F2/F3 (DATABASE.md). */
export const purchaseDocuments = pgTable(
  "purchase_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    fiscalPeriodId: uuid("fiscal_period_id")
      .notNull()
      .references(() => fiscalPeriods.id),
    kind: text("kind").notNull().default("invoice"),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id),
    docNumber: text("doc_number").notNull(),
    controlNumber: text("control_number").notNull(),
    affectedDocumentId: uuid("affected_document_id"),
    fechaDocumento: date("fecha_documento").notNull(),
    fechaRecepcion: date("fecha_recepcion"),
    fechaFiscal: date("fecha_fiscal").notNull(),
    baseImponible: numeric("base_imponible", { precision: 18, scale: 2 }).notNull(),
    ivaCausado: numeric("iva_causado", { precision: 18, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 18, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("VES"),
    status: text("status").notNull().default("validated"),
    sourceFileId: uuid("source_file_id"),
    sourceRowNumber: integer("source_row_number"),
    importBatchId: uuid("import_batch_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_purchase_doc").on(t.companyId, t.partyId, t.kind, t.docNumber, t.controlNumber),
    index("idx_purchase_company_period").on(t.companyId, t.fiscalPeriodId, t.status),
    index("idx_purchase_batch").on(t.importBatchId),
  ],
);

export const purchaseDocumentLines = pgTable("purchase_document_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  documentId: uuid("document_id")
    .notNull()
    .references(() => purchaseDocuments.id),
  lineNumber: integer("line_number").notNull(),
  taxCategory: text("tax_category").notNull(),
  taxRate: numeric("tax_rate", { precision: 18, scale: 6 }),
  base: numeric("base", { precision: 18, scale: 2 }).notNull(),
  iva: numeric("iva", { precision: 18, scale: 2 }).notNull().default("0"),
  description: text("description"),
});
