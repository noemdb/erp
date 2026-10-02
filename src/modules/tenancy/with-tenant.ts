import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export type TenantContext = {
  companyId: string;
  userId: string;
};

export type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Todo acceso operativo pasa por aquí (ARCHITECTURE + API.md).
 * Abre TX, fija `SET LOCAL app.company_id/user_id` (seguro con pooling)
 * y recién entonces ejecuta fn. RLS lo usa como defensa en profundidad.
 */
export async function withTenant<T>(ctx: TenantContext, fn: (tx: DrizzleTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    // set_config() en vez de SET LOCAL: acepta parámetros vinculados
    // (SET con $1 falla en prepared statements). is_local=true ≡ SET LOCAL.
    await tx.execute(sql`SELECT set_config('app.company_id', ${ctx.companyId}, true)`);
    await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId}, true)`);
    return fn(tx as DrizzleTx);
  });
}
