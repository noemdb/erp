import { pgTable, uuid, text, boolean, date, timestamp, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { citext } from "./custom";

export type AbonoCriterion = "unset" | "payment_only" | "account_credit_or_payment";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  rif: citext("rif").notNull().unique(),
  rifOriginal: text("rif_original").notNull(),
  razonSocial: text("razon_social").notNull(),
  nombreComercial: text("nombre_comercial"),
  domicilioFiscal: text("domicilio_fiscal"),
  telefono: text("telefono"),
  emailContacto: text("email_contacto"),
  colorDistintivo: text("color_distintivo"),
  logoUrl: text("logo_url"),
  condicionIva: text("condicion_iva").notNull(),
  contribuyenteEspecialDesde: date("contribuyente_especial_desde"),
  agenteRetencionIva: boolean("agente_retencion_iva").notNull().default(false),
  agenteRetencionIslr: boolean("agente_retencion_islr").notNull().default(false),
  periodKind: text("period_kind").notNull().default("monthly"),
  currencyFunctional: text("currency_functional").notNull().default("VES"),
  abonoCriterion: text("abono_criterion").$type<AbonoCriterion>().notNull().default("unset"),
  /** G7: fuente del Libro de Ventas por empresa ('invoices' | 'z'). Sin mezcla por período. */
  salesMode: text("sales_mode").notNull().default("invoices"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("chk_companies_abono_criterion", sql`${t.abonoCriterion} IN ('unset', 'payment_only', 'account_credit_or_payment')`),
  check("chk_companies_sales_mode", sql`${t.salesMode} IN ('invoices', 'z')`),
]);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    codigo: text("codigo").notNull(),
    nombre: text("nombre").notNull(),
    direccion: text("direccion"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_branches_company_codigo").on(t.companyId, t.codigo)],
);
