import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./identity";

/** Sesiones en DB (ADR-010). Cookie guarda token opaco; aquí solo su sha256. Sin RLS: global como users. */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
