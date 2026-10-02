import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { daterange } from "./custom";
import { companies } from "./tenancy";

export const fiscalPeriods = pgTable(
  "fiscal_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    kind: text("kind").notNull(),
    range: daterange("range").notNull(),
    status: text("status").notNull().default("open"),
    closedBy: uuid("closed_by"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closureHash: text("closure_hash"),
    reopenReason: text("reopen_reason"),
    reopenedBy: uuid("reopened_by"),
    reopenedAt: timestamp("reopened_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_periods_company_kind_range").on(t.companyId, t.kind, t.range)],
);
