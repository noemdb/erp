import { pgTable, uuid, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { citext, daterange } from "./custom";
import { companies } from "./tenancy";

export const parties = pgTable(
  "parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    rif: citext("rif").notNull(),
    rifOriginal: text("rif_original").notNull(),
    razonSocial: text("razon_social").notNull(),
    direccionFiscal: text("direccion_fiscal"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_parties_company_rif").on(t.companyId, t.rif)],
);

export const partyTaxProfiles = pgTable("party_tax_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  partyId: uuid("party_id")
    .notNull()
    .references(() => parties.id),
  tipoPersona: text("tipo_persona").notNull(),
  residente: boolean("residente").notNull().default(true),
  condicionIva: text("condicion_iva"),
  sujetoRetencionIva: boolean("sujeto_retencion_iva").notNull().default(false),
  sujetoRetencionIslr: boolean("sujeto_retencion_islr").notNull().default(false),
  effectiveRange: daterange("effective_range").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
