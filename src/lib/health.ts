import { existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { env } from "./env";

export type HealthStatus = {
  status: "ok" | "degraded";
  db: { ok: boolean; latencyMs: number };
  storage: { ok: boolean; driver: string };
};

/** Chequeo para monitoreo y alertas (jobs fallidos y backup se vigilan aparte en F7). */
export async function checkHealth(): Promise<HealthStatus> {
  const t0 = Date.now();
  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const storageOk = env.STORAGE_DRIVER === "fs" ? existsSync(env.STORAGE_PATH) : true;
  const ok = dbOk && storageOk;
  return {
    status: ok ? "ok" : "degraded",
    db: { ok: dbOk, latencyMs: Date.now() - t0 },
    storage: { ok: storageOk, driver: env.STORAGE_DRIVER },
  };
}
