import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, withholdingRules, withholdingConcepts, auditEvents } from "@/db/schema";
import { createDraft, submitRule, approveRule, activateRule } from "./service";
import { resolveIvaRule } from "@/modules/withholdings/rules";
import { GLOBAL_SCOPE } from "@/modules/withholdings/constants";

const s = randomUUID().slice(0, 8);

describe("Fiscal Change Control", () => {
  it("borrador→revisión→aprobación→activación cierra vigencia anterior sin editarla", async () => {
    const [u] = await db.insert(users).values({ email: `rw-${s}@test.local`, passwordHash: "x", name: "R" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-47${s}-A`, rifOriginal: `J-47${s}-A`, razonSocial: "Rw CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    const base = { ruleKind: "iva" as const, baseFormulaKind: "iva_causado", legalReference: "Providencia X", changeReason: "ajuste" };
    try {
      const v1 = await createDraft(ctx, { ...base, effectiveFrom: "2026-01-01", porcentaje: "0.75" });
      expect(v1.ok).toBe(true);
      if (!v1.ok) throw new Error("setup");
      expect((await activateRule(ctx, v1.id)).ok).toBe(false); // orden estricto
      expect((await submitRule(ctx, v1.id)).ok).toBe(true);
      expect((await approveRule(ctx, v1.id)).ok).toBe(true);
      expect((await activateRule(ctx, v1.id)).ok).toBe(true);

      const v2 = await createDraft(ctx, { ...base, effectiveFrom: "2026-06-01", porcentaje: "1.00" });
      expect(v2.ok).toBe(true);
      if (!v2.ok) throw new Error("setup2");
      await submitRule(ctx, v2.id);
      await approveRule(ctx, v2.id);
      expect((await activateRule(ctx, v2.id)).ok).toBe(true);

      const rows = await db.select().from(withholdingRules).where(eq(withholdingRules.companyScopeKey, c!.id));
      const old = rows.find((r) => r.id === v1.id)!;
      expect(old.status).toBe("superseded");
      expect(old.effectiveRange).toBe("[2026-01-01,2026-06-01)");
      expect(old.porcentaje).toBe("0.750000"); // historia intacta (numeric(18,6))

      // v1 activa cubría marzo; tras superseder, julio resuelve v2 y marzo al seed global.
      // (La historia de marzo vive en rule_version_id de sus comprobantes, no en resolución viva.)
      const rule2 = await db.transaction(async (tx) => resolveIvaRule(tx, c!.id, "2026-07-01"));
      expect(rule2?.id).toBe(v2.id);
      const ruleOld = await db.transaction(async (tx) => resolveIvaRule(tx, c!.id, "2026-03-01"));
      expect(ruleOld?.companyScopeKey).toBe(GLOBAL_SCOPE);

      const trail = await db.select().from(auditEvents).where(eq(auditEvents.companyId, c!.id));
      expect(trail.filter((t) => t.entityType === "withholding_rule").length).toBeGreaterThanOrEqual(8);
    } finally {
      await db.delete(withholdingRules).where(eq(withholdingRules.companyScopeKey, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
