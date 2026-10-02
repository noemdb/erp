import { pgTable, uuid, text, integer, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { companies } from "./tenancy";
import { users } from "./identity";
import { fiscalPeriods } from "./periods";

/** Versiones congeladas de reportes (F5). Regenerar debe dar el mismo sha256. */
export const generatedReports = pgTable(
  "generated_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    fiscalPeriodId: uuid("fiscal_period_id")
      .notNull()
      .references(() => fiscalPeriods.id),
    kind: text("kind").notNull(),
    version: integer("version").notNull(),
    format: text("format").notNull(),
    dataSnapshot: jsonb("data_snapshot").notNull(),
    sha256: text("sha256").notNull(),
    storagePath: text("storage_path").notNull(),
    generatedBy: uuid("generated_by").references(() => users.id),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_reports").on(t.companyId, t.fiscalPeriodId, t.kind, t.version, t.format)],
);
