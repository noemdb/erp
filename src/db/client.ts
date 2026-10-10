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
const options = {
  max: 10,
  // SET con bind falla en prepared (TODO F1): nunca activar prepared.
  prepare: false as const,
  // Neon cierra conexiones ociosas y el arranque en frío es lento:
  // fallar rápido al conectar y reciclar sockets antes de que el servidor los corte.
  // Reduce `read ECONNRESET` sobre sockets ociosos; no lo elimina si el endpoint cae.
  connect_timeout: 15,
  idle_timeout: 20,
  max_lifetime: 60 * 10,
};

// En dev (Turbopack/HMR) el módulo se re-evalúa por cada recarga: sin caché se
// acumulan pools con sockets viejos. Se reutiliza una sola instancia por proceso.
const g = globalThis as unknown as { __erpPg?: ReturnType<typeof postgres> };
if (!g.__erpPg) g.__erpPg = postgres(url, options);
const client = g.__erpPg;

export const db = drizzle(client, { schema });
export type DrizzleDb = typeof db;
