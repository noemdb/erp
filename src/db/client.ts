import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Runtime de mínimo privilegio (1.0.5 §5.2, ADR-015/023): en staging/prod,
 * exportar DB_LEAST_PRIVILEGE=true + APP_DATABASE_URL (rol app_runtime).
 * En dev se mantiene owner porque los seeds de pruebas escriben directo;
 * migrar los tests a contexto explícito antes de activarlo en dev.
 */
const url =
  (process.env.DB_LEAST_PRIVILEGE === "true" && process.env.APP_DATABASE_URL) || env.DATABASE_URL;

// postgres-js devuelve numeric como string (exigido ADR-003). No convertir a number.
const client = postgres(url, { max: 10, prepare: false });

export const db = drizzle(client, { schema });
export type DrizzleDb = typeof db;
