import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, withholdingRules, auditEvents } from "@/db/schema";
import { createDraft, submitRule, approveRule, activateRule } from "./service";

const s = randomUUID().slice(0, 8);

describe("guardia sintética (2.0.2 ítem 1)", () => {
  it("sintética no activa en producción; en dev sí (marcada)", async () => {
    const [u] = await db.insert(users).values({ email: `cg-${s}@test.local`, passwordHash: "x", name: "C" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-57${s}-A`, rifOriginal: `J-57${s}-A`, razonSocial: "Cg CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    try {
      const d = await createDraft(ctx, { ruleKind: "iva", baseFormulaKind: "iva_causado", legalReference: "test", changeReason: "test", effectiveFrom: "2026-01-01", porcentaje: "0.75" });
      expect(d.ok).toBe(true);
      if (!d.ok) throw new Error("setup");
      await db.update(withholdingRules).set({ synthetic: true }).where(eq(withholdingRules.id, d.id));
      await submitRule(ctx, d.id);
      await approveRule(ctx, d.id);
      env.NODE_ENV = "production";
      const blocked = await activateRule(ctx, d.id);
      expect(blocked.ok).toBe(false);
      env.NODE_ENV = prev;
      expect((await activateRule(ctx, d.id)).ok).toBe(true);
    } finally {
      env.NODE_ENV = prev;
      await db.delete(withholdingRules).where(eq(withholdingRules.companyScopeKey, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
