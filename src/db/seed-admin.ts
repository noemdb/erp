/** Seed admin inicial idempotente: usuario + empresa demo + membresía admin. Uso: npm run seed:admin */
import { eq } from "drizzle-orm";
import { db } from "./client";
import { users, companies, companyUser } from "./schema";
import { hashPassword } from "@/modules/identity/password";

async function main() {
  const email = (process.env.INITIAL_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "";
  if (!email || !password) throw new Error("Faltan INITIAL_ADMIN_EMAIL/PASSWORD en .env");

  let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, passwordHash: await hashPassword(password), name: "Admin inicial" })
      .returning();
    console.log("usuario creado:", email);
  } else console.log("usuario existe:", email);

  let company = (await db.select().from(companies).where(eq(companies.rif, "J-00000001-0")).limit(1))[0];
  if (!company) {
    [company] = await db
      .insert(companies)
      .values({ rif: "J-00000001-0", rifOriginal: "J-00000001-0", razonSocial: "Empresa Demo, C.A.", condicionIva: "ordinario" })
      .returning();
    console.log("empresa demo creada");
  }
  const mem = await db
    .select()
    .from(companyUser)
    .where(eq(companyUser.companyId, company!.id))
    .limit(1);
  if (!mem.some((m) => m.userId === user!.id)) {
    await db.insert(companyUser).values({ companyId: company!.id, userId: user!.id, role: "admin" });
    console.log("membresía admin creada");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
