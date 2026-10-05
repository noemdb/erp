/** Seed sesión de prácticas: 4 personalidades con roles estrictos en la empresa demo.
 * - Alejandro (admin): tenencia, reglas, roles, infraestructura.
 * - María (administrativo): prepara data (CSV/staging), no emite.
 * - Carlos (contador): valida, configura abono, emite IVA/ISLR, cierra período.
 * - Lic. Vargas (auditor): solo lectura (inmutabilidad, auditoría, series).
 * Idempotente: crea o rota clave; asegura una membresía por rol en J-00000001-0
 * sin tocar otras membresías. Cuentas fijas @practica.local (nunca reales).
 * Uso: PRACTICA_PASSWORD=<clave> npm run seed:practica (con .env para DATABASE_URL).
 */
import { eq } from "drizzle-orm";
import { db } from "./client";
import { users, companies, companyUser } from "./schema";
import { hashPassword } from "@/modules/identity/password";

const DEMO_RIF = "J-00000001-0";

const ELENCO = [
  { email: "alejandro@practica.local", name: "Alejandro (Admin Sistema)", role: "admin" },
  { email: "maria@practica.local", name: "María (Administrativo)", role: "administrativo" },
  { email: "carlos@practica.local", name: "Carlos (Contador)", role: "contador" },
  { email: "vargas@practica.local", name: "Lic. Vargas (Auditor)", role: "auditor" },
] as const;

async function main() {
  const pw = process.env.PRACTICA_PASSWORD ?? "";
  if (!pw) throw new Error("PRACTICA_PASSWORD sin definir: clave solo para la sesión (@practica.local).");
  let company = (await db.select().from(companies).where(eq(companies.rif, DEMO_RIF)).limit(1))[0];
  if (!company) {
    [company] = await db
      .insert(companies)
      .values({ rif: DEMO_RIF, rifOriginal: DEMO_RIF, razonSocial: "Empresa Demo, C.A.", condicionIva: "ordinario" })
      .returning();
    console.log("empresa demo creada");
  }
  for (const p of ELENCO) {
    let u = (await db.select().from(users).where(eq(users.email, p.email)).limit(1))[0];
    if (!u) {
      [u] = await db
        .insert(users)
        .values({ email: p.email, passwordHash: await hashPassword(pw), name: p.name })
        .returning();
      console.log("usuario creado:", p.email);
    } else {
      await db.update(users).set({ passwordHash: await hashPassword(pw), name: p.name }).where(eq(users.id, u.id));
      console.log("clave rotada:", p.email);
    }
    const mem = await db.select().from(companyUser).where(eq(companyUser.userId, u!.id));
    if (!mem.some((m) => m.companyId === company!.id && m.role === p.role)) {
      await db.insert(companyUser).values({ companyId: company!.id, userId: u!.id, role: p.role });
      console.log(`membresía ${p.email} → ${p.role} en demo`);
    } else console.log(`membresía ${p.email} → ${p.role} ya existe`);
  }
  console.log("listo: 4 personalidades en empresa demo.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
