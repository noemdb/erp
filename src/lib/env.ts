import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL requerida"),
  DATABASE_MIGRATION_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET min 32 chars"),
  FILE_SIGNING_SECRET: z.string().optional(),
  SESSION_COOKIE_NAME: z.string().default("__Host-session"),
  STORAGE_DRIVER: z.enum(["fs", "s3"]).default("fs"),
  STORAGE_PATH: z.string().default("./storage"),
  MAX_UPLOAD_MB: z.coerce.number().default(10),
  PGBOSS_SCHEMA: z.string().default("pgboss"),
  LOG_LEVEL: z.string().default("info"),
});

export const env = EnvSchema.parse(process.env);

/** URL para migraciones: rol migrador si existe, si no DIRECT_URL, si no app. */
export function migrationUrl(): string {
  return env.DATABASE_MIGRATION_URL ?? env.DIRECT_URL ?? env.DATABASE_URL;
}
