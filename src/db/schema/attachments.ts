import { pgTable, uuid, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { companies } from "./tenancy";
import { users } from "./identity";

/** Metadatos de adjuntos (2.0.2 ítem 7). El binario vive en el driver (clave sha256); RLS por empresa. */
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  sha256: text("sha256").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  mime: text("mime").notNull(),
  originalName: text("original_name").notNull(),
  storageKey: text("storage_key").notNull(),
  status: text("status").notNull().default("active"),
  voidReason: text("void_reason"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
