import { pgTable, uuid, text, integer, jsonb, date, timestamp, unique } from "drizzle-orm/pg-core";
import { companies } from "./tenancy";

/**
 * Plazos 1.0.2: cada obligación guarda tipo, fuente, artículo, vigencia, regla y
 * calendario. Sin valores sembrados: el contador las configura (gate).
 */
export const fiscalObligations = pgTable(
  "fiscal_obligations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    kind: text("kind").notNull(),
    fuenteNormativa: text("fuente_normativa").notNull(),
    articulo: text("articulo").notNull(),
    effectiveRange: text("effective_range").notNull(),
    baseCalculo: text("base_calculo").notNull().default("next_period"),
    diasHabiles: integer("dias_habiles").notNull().default(2),
    params: jsonb("params"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_obligations").on(t.companyId, t.kind)],
);

/** Feriados del calendario aplicable (además de sábados/domingos). */
export const fiscalHolidays = pgTable(
  "fiscal_holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    fecha: date("fecha").notNull(),
    descripcion: text("descripcion"),
  },
  (t) => [unique("uq_holidays").on(t.companyId, t.fecha)],
);
