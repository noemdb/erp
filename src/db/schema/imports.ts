import { pgTable, uuid, text, bigint, integer, jsonb, timestamp, unique, index, customType } from "drizzle-orm/pg-core";
import { companies } from "./tenancy";
import { users } from "./identity";
import { fiscalPeriods } from "./periods";

/** Archivo original conservado íntegro (evidencia). Idempotencia por (company, sha256). */
export const sourceFiles = pgTable(
  "source_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    sha256: text("sha256").notNull(),
    originalName: text("original_name").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    content: customType<{ data: Buffer }>({ dataType: () => "bytea" })("content").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_source_company_sha").on(t.companyId, t.sha256)],
);

export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  sourceFileId: uuid("source_file_id")
    .notNull()
    .references(() => sourceFiles.id),
  kind: text("kind").notNull(),
  sourceSystem: text("source_system").notNull(),
  fiscalPeriodId: uuid("fiscal_period_id").references(() => fiscalPeriods.id),
  mappingProfile: jsonb("mapping_profile"),
  status: text("status").notNull().default("uploaded"),
  totalRows: integer("total_rows").notNull().default(0),
  validRows: integer("valid_rows").notNull().default(0),
  warningRows: integer("warning_rows").notNull().default(0),
  rejectedRows: integer("rejected_rows").notNull().default(0),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id),
    rowNumber: integer("row_number").notNull(),
    raw: jsonb("raw").notNull(),
    normalized: jsonb("normalized"),
    errors: jsonb("errors"),
    status: text("status").notNull().default("pending"),
  },
  (t) => [
    unique("uq_rows_batch_number").on(t.batchId, t.rowNumber),
    index("idx_rows_batch_status").on(t.batchId, t.status),
  ],
);
