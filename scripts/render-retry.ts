/** FUN-06 (ejecutor mínimo, ADR-031): reintenta renders pendientes sin pg-boss.
 * Idempotente: renderIvaPdf no re-renderiza un `done`. Para el planificador del
 * host (cron/systemd cada pocos minutos). El actor se audita y debe poder emitir.
 *
 * Uso:
 *   COMPANY_ID=<uuid> RETRY_USER_EMAIL=<contador> npm run render:retry
 *   RETRY_USER_EMAIL=<contador> npm run render:retry -- --all
 *   RENDER_STALE_MINUTES=30 (alerta si un pending supera esa edad tras reintentar)
 *
 * Salida: 0 todo renderizado · 1 fallos de render · 2 pendientes vencidos (alerta).
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users, companies, companyUser } from "../src/db/schema";
import { authorize } from "../src/modules/tenancy/authorize";
import { listPendingRenders, renderIvaPdf, renderIslrPdf } from "../src/modules/withholdings/render-job";

const STALE_MIN = Number(process.env.RENDER_STALE_MINUTES ?? 30);

async function actorFor(companyId: string, email: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) throw new Error(`usuario no existe: ${email}`);
  const mem = await db.select().from(companyUser)
    .where(eq(companyUser.companyId, companyId)).limit(50);
  if (!mem.some((m) => m.userId === u.id)) throw new Error(`sin membresía en ${companyId}`);
  const auth = await authorize(companyId, u.id, "withholdings.issue");
  if (!auth.ok) throw new Error(`${email} no puede emitir en ${companyId} (requiere contador)`);
  return { companyId, userId: u.id };
}

async function runOne(companyId: string, email: string) {
  const ctx = await actorFor(companyId, email);
  const pend = await listPendingRenders(ctx);
  const failed: string[] = [];
  for (const p of pend) {
    const r = p.kind === "islr" ? await renderIslrPdf(ctx, p.id) : await renderIvaPdf(ctx, p.id);
    if (!r.ok) failed.push(`${p.kind}:${p.certificateNumber} (${p.id}): ${r.error.code}`);
  }
  const rest = await listPendingRenders(ctx);
  const now = Date.now();
  const stale = rest.filter((r) => !r.issuedAt || now - new Date(r.issuedAt).getTime() > STALE_MIN * 60_000);
  return { companyId, pendientes: pend.length, fallidos: failed, vencidos: stale.map((s) => s.certificateNumber), failed };
}

async function main() {
  const email = (process.argv[3] ?? process.env.RETRY_USER_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.error("uso: COMPANY_ID=<uuid> RETRY_USER_EMAIL=<email> npm run render:retry [-- --all]");
    process.exit(1);
  }
  const all = process.argv.includes("--all");
  let ids: string[] = [];
  if (all) {
    ids = (await db.select({ id: companies.id }).from(companies)).map((c) => c.id);
  } else {
    const id = (process.argv[2] ?? process.env.COMPANY_ID ?? "").trim();
    if (!id) {
      console.error("uso: COMPANY_ID=<uuid> RETRY_USER_EMAIL=<email> npm run render:retry [-- --all]");
      process.exit(1);
    }
    ids = [id];
  }
  let code = 0;
  for (const id of ids) {
    try {
      const r = await runOne(id, email);
      console.log(`OK ${id}: pendientes=${r.pendientes} fallidos=${r.fallidos.length} vencidos=${r.vencidos.length}`);
      for (const f of r.fallidos) console.log(`  fallo: ${f}`);
      for (const v of r.vencidos) console.log(`  ALERTA: pending > ${STALE_MIN}min: ${v}`);
      if (r.fallidos.length > 0) code = Math.max(code, 1);
      if (r.vencidos.length > 0) code = Math.max(code, 2);
    } catch (e) {
      console.error(`ERROR ${id}: ${e instanceof Error ? e.message : e}`);
      code = Math.max(code, 1);
    }
  }
  process.exit(code);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
