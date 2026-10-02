import { pgTable, uuid, text, numeric, date, timestamp, unique } from "drizzle-orm/pg-core";
import { companies, branches } from "./tenancy";
import { fiscalPeriods } from "./periods";

/** Máquinas fiscales por empresa (G7), opcionalmente atadas a sucursal. Serie física, no numeración del sistema. */
export const fiscalMachines = pgTable(
  "fiscal_machines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id").references(() => branches.id),
    serial: text("serial").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_machines_company_serial").on(t.companyId, t.serial)],
);

/** Reportes Z diarios (F3-3). Alimentan Libro de Ventas en modo Z (F5). */
export const zReports = pgTable(
  "z_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => fiscalMachines.id),
    fiscalPeriodId: uuid("fiscal_period_id")
      .notNull()
      .references(() => fiscalPeriods.id),
    fecha: date("fecha").notNull(),
    zNumber: text("z_number").notNull(),
    rangeFrom: text("range_from").notNull(),
    rangeTo: text("range_to").notNull(),
    ventasGravadas: numeric("ventas_gravadas", { precision: 18, scale: 2 }).notNull(),
    ventasExentas: numeric("ventas_exentas", { precision: 18, scale: 2 }).notNull().default("0"),
    iva: numeric("iva", { precision: 18, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 18, scale: 2 }).notNull(),
    sourceFileId: uuid("source_file_id"),
  },
  (t) => [unique("uq_z_company_machine_number").on(t.companyId, t.machineId, t.zNumber)],
);
