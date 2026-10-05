/** ACC-05: usuarios e2e por rol en la empresa demo (idempotente, solo @test.local).
 * Nunca toca usuarios reales: altas fijas e2e-<rol>@test.local + membresía en
 * J-00000001-0. La clave sale de E2E_PASSWORD (sin valor por defecto a propósito).
 * Uso: E2E_PASSWORD=<clave> npm run e2e:seed (con .env cargado para DATABASE_URL).
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users, companies, companyUser } from "../src/db/schema";
import { hashPassword } from "../src/modules/identity/password";

export const ROLES = ["admin", "administrativo", "contador", "auditor"] as const;
export type Rol = (typeof ROLES)[number];
export const emailDe = (rol: Rol) => `e2e-${rol}@test.local`;
export const DEMO_RIF = "J-00000001-0";

async function main() {
  const pw = process.env.E2E_PASSWORD ?? "";
  if (!pw) throw new Error("E2E_PASSWORD sin definir: exporta una clave solo para los usuarios e2e (@test.local).");
  let company = (await db.select().from(companies).where(eq(companies.rif, DEMO_RIF)).limit(1))[0];
  if (!company) {
    [company] = await db
      .insert(companies)
      .values({ rif: DEMO_RIF, rifOriginal: DEMO_RIF, razonSocial: "Empresa Demo, C.A.", condicionIva: "ordinario" })
      .returning();
    console.log("empresa demo creada");
  }
  for (const rol of ROLES) {
    const email = emailDe(rol);
    // El seed es dueño de estas cuentas fijas: siempre deja la clave = E2E_PASSWORD.
    let u = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!u) {
      [u] = await db
        .insert(users)
        .values({ email, passwordHash: await hashPassword(pw), name: `E2E ${rol}` })
        .returning();
      console.log("usuario creado:", email);
    } else {
      await db.update(users).set({ passwordHash: await hashPassword(pw) }).where(eq(users.id, u.id));
      console.log("clave rotada:", email);
    }
    const mem = await db.select().from(companyUser).where(eq(companyUser.userId, u!.id)).limit(10);
    await db.delete(companyUser).where(eq(companyUser.userId, u!.id));
    await db.insert(companyUser).values({ companyId: company!.id, userId: u!.id, role: rol });
    if (mem.length > 0) console.log(`membresía ${email} → ${rol} (una sola empresa: el login redirige a /c/…)`);
  }
  console.log("listo: 4 roles en empresa demo.");
  process.exit(0);
}

// Solo ejecuta al invocarse directo (`npm run e2e:seed`): helpers.ts importa
// ROLES/emailDe y un main() al importar mataría el worker de Playwright.
if (process.argv[1]?.endsWith("e2e/seed.ts") || process.argv[1]?.endsWith("seed.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
