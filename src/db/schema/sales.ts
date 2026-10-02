import { pgTable, uuid, text, numeric, date, timestamp, integer, boolean, unique, index } from "drizzle-orm/pg-core";
import { companies } from "./tenancy";
import { parties } from "./parties";
import { fiscalPeriods } from "./periods";
import { purchaseDocuments } from "./fiscal-docs";

/** Subconjunto F2-2c. Z/máquinas (`z_summary` modo) llegan con importador Z en F3. */
export const salesDocuments = pgTable(
  "sales_documents",
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
    sourceType: text("source_type").notNull().default("manual"),
    fechaDocumento: date("fecha_documento").notNull(),
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
    unique("uq_sales_doc").on(t.companyId, t.partyId, t.kind, t.docNumber, t.controlNumber),
    index("idx_sales_company_period").on(t.companyId, t.fiscalPeriodId, t.status),
    index("idx_sales_batch").on(t.importBatchId),
  ],
);

export const salesDocumentLines = pgTable("sales_document_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  documentId: uuid("document_id")
    .notNull()
    .references(() => salesDocuments.id),
  lineNumber: integer("line_number").notNull(),
  taxCategory: text("tax_category").notNull(),
  taxRate: numeric("tax_rate", { precision: 18, scale: 6 }),
  base: numeric("base", { precision: 18, scale: 2 }).notNull(),
  iva: numeric("iva", { precision: 18, scale: 2 }).notNull().default("0"),
  description: text("description"),
});

/** Eventos de pago/abono en cuenta; legacy SQL names remain during the staged migration. */
export const settlementEvents = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  partyId: uuid("party_id")
    .notNull()
    .references(() => parties.id),
  eventType: text("event_type").$type<"payment" | "account_credit">().notNull().default("payment"),
  eventDate: date("fecha_pago").notNull(),
  amount: numeric("monto", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("VES"),
  method: text("metodo"),
  sourceRef: text("source_ref"),
  inferred: boolean("inferred").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settlementAllocations = pgTable(
  "payment_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    eventId: uuid("payment_id")
      .notNull()
      .references(() => settlementEvents.id),
    purchaseDocumentId: uuid("purchase_document_id")
      .notNull()
      .references(() => purchaseDocuments.id),
    amountAllocated: numeric("monto_asignado", { precision: 18, scale: 2 }).notNull(),
  },
  (t) => [unique("uq_alloc_payment_purchase").on(t.eventId, t.purchaseDocumentId)],
);
