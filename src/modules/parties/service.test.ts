import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, parties, partyTaxProfiles, auditEvents } from "@/db/schema";
import { upsertParty, setTaxProfile } from "./service";

const s = randomUUID().slice(0, 8);

describe("terceros y perfiles", () => {
  it("crea, rechaza RIF inválido, versiona vigencia sin solapar", async () => {
    const [u] = await db.insert(users).values({ email: `pty-${s}@test.local`, passwordHash: "x", name: "P" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-33${s}-A`, rifOriginal: `J-33${s}-A`, razonSocial: "Pty CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      const bad = await upsertParty(ctx, { rif: "XXX", razonSocial: "No" });
      expect(bad.ok).toBe(false);

      const created = await upsertParty(ctx, { rif: "j-12345678-9", razonSocial: "Prov Uno" });
      expect(created.ok).toBe(true);
      if (!created.ok) throw new Error("setup");
      const pid = created.id;

      // RIF normalizado distinto formato → mismo tercero (update)
      const again = await upsertParty(ctx, { rif: "J123456789", razonSocial: "Prov Uno CA" });
      expect(again.ok && again.id === pid).toBe(true);

      const p1 = await setTaxProfile(ctx, pid, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: false, effectiveFrom: "2026-01-01" });
      expect(p1.ok).toBe(true);
      const p2 = await setTaxProfile(ctx, pid, { tipoPersona: "juridica", residente: true, sujetoRetencionIva: true, sujetoRetencionIslr: true, effectiveFrom: "2026-06-01" });
      expect(p2.ok).toBe(true);

      const retro = await setTaxProfile(ctx, pid, { tipoPersona: "juridica", residente: true, effectiveFrom: "2025-01-01" });
      expect(retro.ok).toBe(false);

      const rows = await db.select().from(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, pid));
      expect(rows).toHaveLength(2);
      expect(rows.some((r) => r.effectiveRange === "[2026-01-01,2026-06-01)")).toBe(true);
      expect(rows.some((r) => r.effectiveRange === "[2026-06-01,)")).toBe(true);
    } finally {
      const ps = await db.select().from(parties).where(eq(parties.companyId, c!.id));
      for (const p of ps) await db.delete(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, p.id));
      await db.delete(parties).where(eq(parties.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
