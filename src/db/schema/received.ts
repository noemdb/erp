import { pgTable, uuid, text, numeric, date, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { companies } from "./tenancy";
import { users } from "./identity";
import { fiscalPeriods } from "./periods";
import { purchaseDocuments } from "./fiscal-docs";

/**
 * G3 (roadmap 1.0.2): retenciones de IVA que terceros practican a la empresa.
 * Flujo registrada → conciliada → aplicada (período explícito elegido al aplicar).
 * El resumen las muestra en línea separada; el neteo contra la cuota requiere
 * decisión del contador (no se resta automáticamente).
 */
export const withholdingsReceived = pgTable(
  "withholdings_received",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    agentRif: text("agent_rif").notNull(),
    agentRazon: text("agent_razon").notNull(),
    certificateNumber: text("certificate_number").notNull(),
    fechaComprobante: date("fecha_comprobante").notNull(),
    fechaRecepcion: date("fecha_recepcion").notNull(),
    fiscalPeriodId: uuid("fiscal_period_id").references(() => fiscalPeriods.id),
    ivaCausado: numeric("iva_causado", { precision: 18, scale: 2 }).notNull().default("0"),
    montoRetenido: numeric("monto_retenido", { precision: 18, scale: 2 }).notNull(),
    status: text("status").notNull().default("registrada"),
    validatedBy: uuid("validated_by").references(() => users.id),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    notes: text("notes"),
    evidence: jsonb("evidence"),
  },
  (t) => [unique("uq_received").on(t.companyId, t.agentRif, t.certificateNumber)],
);

export const receivedLinks = pgTable("received_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  receivedId: uuid("received_id")
    .notNull()
    .references(() => withholdingsReceived.id),
  purchaseDocumentId: uuid("purchase_document_id")
    .notNull()
    .references(() => purchaseDocuments.id),
  montoImputado: numeric("monto_imputado", { precision: 18, scale: 2 }),
});
