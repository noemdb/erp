import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { companies, companyUser, fiscalPeriods } from "@/db/schema";

/** Lecturas tenancy para UI (app/ nunca importa @/db directo). */
export async function listUserCompanies(userId: string) {
  const memberships = await db
    .select({ companyId: companyUser.companyId, role: companyUser.role })
    .from(companyUser)
    .where(eq(companyUser.userId, userId));
  if (memberships.length === 0) return [];
  return db
    .select()
    .from(companies)
    .where(
      inArray(
        companies.id,
        memberships.map((m) => m.companyId),
      ),
    );
}

export async function getCompanyContext(companyId: string, userId: string) {
  const mem = await db
    .select({ role: companyUser.role })
    .from(companyUser)
    .where(and(eq(companyUser.companyId, companyId), eq(companyUser.userId, userId)))
    .limit(1);
  if (!mem[0]) return null;
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const periods = await db
    .select()
    .from(fiscalPeriods)
    .where(eq(fiscalPeriods.companyId, companyId))
    .limit(5);
  return { company, role: mem[0].role, periods };
}
