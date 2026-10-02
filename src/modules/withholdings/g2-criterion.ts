import { eq } from "drizzle-orm";
import { z } from "zod";
import { companies, type AbonoCriterion } from "@/db/schema";
import { record } from "@/modules/audit/record";
import { withTenant } from "@/modules/tenancy/with-tenant";
import type { Ctx } from "./issue-islr";

export type { AbonoCriterion } from "@/db/schema/tenancy";
export const AbonoCriterionSchema = z.enum(["unset", "payment_only", "account_credit_or_payment"]);

const ConfigureAbonoCriterionSchema = z.object({
  criterion: AbonoCriterionSchema,
  reason: z.string().trim().min(10).max(500),
});

export async function getAbonoCriterion(ctx: Ctx): Promise<AbonoCriterion> {
  return withTenant(ctx, async (tx) => {
    const [company] = await tx
      .select({ criterion: companies.abonoCriterion })
      .from(companies)
      .where(eq(companies.id, ctx.companyId))
      .limit(1);
    if (!company) throw { code: "NOT_FOUND", message: "Empresa no existe." };
    return company.criterion;
  });
}

export async function configureAbonoCriterion(ctx: Ctx, raw: z.input<typeof ConfigureAbonoCriterionSchema>) {
  const parsed = ConfigureAbonoCriterionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message },
    };
  }

  return withTenant(ctx, async (tx) => {
    const [company] = await tx
      .select({ criterion: companies.abonoCriterion })
      .from(companies)
      .where(eq(companies.id, ctx.companyId))
      .limit(1);
    if (!company) {
      return { ok: false as const, error: { code: "NOT_FOUND", message: "Empresa no existe." } };
    }
    if (company.criterion === parsed.data.criterion) {
      return { ok: true as const, criterion: company.criterion, unchanged: true };
    }

    await tx
      .update(companies)
      .set({ abonoCriterion: parsed.data.criterion, updatedAt: new Date() })
      .where(eq(companies.id, ctx.companyId));
    await record(tx, {
      companyId: ctx.companyId,
      actorUserId: ctx.userId,
      action: "configure",
      entityType: "company_abono_criterion",
      entityId: ctx.companyId,
      before: { criterion: company.criterion },
      after: { criterion: parsed.data.criterion },
      reason: parsed.data.reason,
    });
    return { ok: true as const, criterion: parsed.data.criterion, unchanged: false };
  });
}
