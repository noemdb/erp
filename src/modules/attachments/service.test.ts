import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, attachments, auditEvents } from "@/db/schema";
import { detectMime, uploadAttachment, downloadTicket, checkTicket, voidAttachment } from "./service";

const s = randomUUID().slice(0, 8);
const PDF = Buffer.concat([Buffer.from("%PDF-1.4 fake"), Buffer.alloc(100)]);

// La firma de descarga exige FILE_SIGNING_SECRET (prod la tiene; en test se usa una efímera).
process.env.FILE_SIGNING_SECRET ??= `test-${s}`;

describe("adjuntos", () => {
  it("rechaza extensión falsa, sube, deduplica, ticket expira/firma ajena fallan, anula", async () => {
    expect(detectMime(Buffer.from("MZ..."), "application/pdf")).toBeNull();
    expect(detectMime(PDF, "application/pdf")).toBe("application/pdf");
    const [u] = await db.insert(users).values({ email: `att-${s}@test.local`, passwordHash: "x", name: "A" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-55${s}-A`, rifOriginal: `J-55${s}-A`, razonSocial: "Att CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "administrativo" });
    const ctx = { companyId: c!.id, userId: u!.id };
    const eid = "00000000-0000-0000-0000-000000000001";
    try {
      const bad = await uploadAttachment(ctx, { entityType: "purchase_document", entityId: eid, originalName: "x.pdf", claimedMime: "application/pdf" }, Buffer.from("MZ..."));
      expect(bad.ok).toBe(false);
      const a = await uploadAttachment(ctx, { entityType: "purchase_document", entityId: eid, originalName: "f.pdf", claimedMime: "application/pdf" }, PDF);
      expect(a.ok).toBe(true);
      if (!a.ok) throw new Error("setup");
      expect(a.deduped).toBeFalsy();
      const b = await uploadAttachment(ctx, { entityType: "purchase_document", entityId: eid, originalName: "f2.pdf", claimedMime: "application/pdf" }, PDF);
      expect(b.ok && b.deduped).toBe(true);

      const t = downloadTicket(ctx, a.id, 1);
      expect(checkTicket(t.url.split("sig=")[1]!.split("&")[0]!, a.id, c!.id, u!.id, t.exp)).toBe(true);
      expect(checkTicket("00", a.id, c!.id, u!.id, t.exp)).toBe(false);
      expect(checkTicket(t.url.split("sig=")[1]!.split("&")[0]!, a.id, c!.id, "otro", t.exp)).toBe(false);
      await new Promise((r) => setTimeout(r, 1100));
      expect(checkTicket(t.url.split("sig=")[1]!.split("&")[0]!, a.id, c!.id, u!.id, t.exp)).toBe(false);

      expect((await voidAttachment(ctx, a.id, "x")).ok).toBe(false);
      expect((await voidAttachment(ctx, a.id, "duplicado")).ok).toBe(true);
    } finally {
      await db.delete(attachments).where(eq(attachments.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
