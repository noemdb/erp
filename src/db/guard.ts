import { sql } from "drizzle-orm";
import { db } from "./client";

/**
 * Arranque defensivo (2.0.5 §3): con DB_LEAST_PRIVILEGE=true verifica que el
 * runtime es app_runtime, sin superuser/BYPASSRLS ni propiedad de tablas.
 * En producción con la bandera en false, no arranca. Falla cerrado.
 */
export async function assertDbRole(): Promise<{ user: string }> {
  const least = process.env.DB_LEAST_PRIVILEGE === "true";
  const prod = process.env.NODE_ENV === "production";
  if (prod && !least) {
    throw new Error("DB_LEAST_PRIVILEGE=false en producción: arranque denegado.");
  }
  if (!least) return { user: "(sin verificar: bandera inactiva)" };
  const raw = (await db.execute(sql`
    SELECT current_user AS user, r.rolsuper, r.rolbypassrls,
      EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user) AS owns_tables
    FROM pg_roles r WHERE r.rolname = current_user
  `)) as unknown as
    | { user: string; rolsuper: boolean; rolbypassrls: boolean; owns_tables: boolean }[]
    | { rows: { user: string; rolsuper: boolean; rolbypassrls: boolean; owns_tables: boolean }[] };
  const rows = Array.isArray(raw) ? raw : raw.rows;
  const r = rows[0]!;
  if (r.user !== "app_runtime" || r.rolsuper || r.rolbypassrls || r.owns_tables) {
    throw new Error(`Rol runtime inválido: user=${r.user} super=${r.rolsuper} bypassrls=${r.rolbypassrls} owns=${r.owns_tables}.`);
  }
  return { user: r.user };
}

/** Semillas demo no deben existir fuera de desarrollo (2.0.5 §2). */
export function seedGuard(): void {
  if (process.env.NODE_ENV === "production" && (process.env.INITIAL_ADMIN_EMAIL || process.env.INITIAL_ADMIN_PASSWORD)) {
    throw new Error("Credenciales de seed presentes en producción: arranque denegado.");
  }
}
