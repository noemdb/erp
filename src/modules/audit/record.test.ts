import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, auditEvents } from "@/db/schema";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "./record";
import { checkRateLimit, resetRateLimitForTests } from "@/lib/rate-limit";

const stamp = Date.now().toString(36);

describe("audit v0 + rate limit", () => {
  it("bloquea al sexto intento en la ventana", () => {
    resetRateLimitForTests();
    for (let i = 0; i < 5; i++) expect(checkRateLimit("t", 5, 60_000)).toBe(true);
    expect(checkRateLimit("t", 5, 60_000)).toBe(false);
  });

  it("record() escribe en la misma TX", async () => {
    const [u] = await db
      .insert(users)
      .values({ email: `aud-${stamp}@test.local`, passwordHash: "x", name: "Aud" })
      .returning({ id: users.id });
    const [c] = await db
      .insert(companies)
      .values({ rif: `J-31000001-${stamp.slice(-1)}0`, rifOriginal: `J-31000001-${stamp.slice(-1)}0`, razonSocial: "Aud CA", condicionIva: "ordinario" })
      .returning({ id: companies.id });
    try {
      const entityId = "00000000-0000-0000-0000-000000000001";
      await withTenant({ companyId: c!.id, userId: u!.id }, async (tx) => {
        await record(tx, { companyId: c!.id, actorUserId: u!.id, action: "create", entityType: "purchase_document", entityId: entityId, after: { total: "116.00" }, reason: "test" }, "tx-test-1");
      });
      const rows = await db.select().from(auditEvents).where(eq(auditEvents.txId, "tx-test-1"));
      expect(rows).toHaveLength(1);
      expect(rows[0]!.action).toBe("create");
    } finally {
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
