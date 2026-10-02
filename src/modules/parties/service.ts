import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { parties, partyTaxProfiles } from "@/db/schema";

export const RifSchema = z
  .string()
  .regex(/^[VEJPG]-?\d{8,9}-?\d?$/i, "RIF inválido (ej. J-12345678-9)")
  .transform((s) => s.toUpperCase().replace(/[\s-]/g, ""));

export const UpsertPartySchema = z.object({
  rif: z.string().min(3).max(20),
  rifOriginal: z.string().min(3).max(25).optional(),
  razonSocial: z.string().min(2).max(200),
  direccionFiscal: z.string().max(500).optional(),
});

export const TaxProfileSchema = z.object({
  tipoPersona: z.enum(["natural", "juridica"]),
  residente: z.boolean().default(true),
  condicionIva: z.string().max(50).optional(),
  sujetoRetencionIva: z.boolean().default(false),
  sujetoRetencionIslr: z.boolean().default(false),
  /** Vigencia desde (YYYY-MM-DD). Cierra la vigente anterior. */
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Ctx = { companyId: string; userId: string };

function lowerOf(range: string): string {
  const m = /^\[(.*?),/.exec(range);
  return m?.[1] ?? "";
}

/** Crea o actualiza tercero por RIF normalizado (preserva original). */
export async function upsertParty(ctx: Ctx, raw: z.input<typeof UpsertPartySchema>) {
  const parsed = UpsertPartySchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  const rifCheck = RifSchema.safeParse(parsed.data.rif);
  if (!rifCheck.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "RIF inválido." } };
  const rif = rifCheck.data;

  return withTenant(ctx, async (tx) => {
    const found = (await tx.select().from(parties).where(and(eq(parties.companyId, ctx.companyId), eq(parties.rif, rif))).limit(1))[0];
    if (found) {
      if (found.status !== "active") return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Tercero inactivo." } };
      const [upd] = await tx
        .update(parties)
        .set({ razonSocial: parsed.data.razonSocial, direccionFiscal: parsed.data.direccionFiscal ?? null, updatedAt: new Date() })
        .where(eq(parties.id, found.id))
        .returning({ id: parties.id });
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "update", entityType: "party", entityId: upd!.id, after: parsed.data }, `tx-party-${upd!.id}`);
      return { ok: true as const, id: upd!.id };
    }
    const [created] = await tx
      .insert(parties)
      .values({ companyId: ctx.companyId, rif, rifOriginal: parsed.data.rifOriginal ?? parsed.data.rif, razonSocial: parsed.data.razonSocial, direccionFiscal: parsed.data.direccionFiscal })
      .returning({ id: parties.id });
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "create", entityType: "party", entityId: created!.id, after: parsed.data }, `tx-party-${created!.id}`);
    return { ok: true as const, id: created!.id };
  });
}

/** Nuevo perfil fiscal: cierra la vigencia abierta y abre la nueva (nunca overwrite). */
export async function setTaxProfile(ctx: Ctx, partyId: string, raw: z.input<typeof TaxProfileSchema>) {
  const parsed = TaxProfileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };

  return withTenant(ctx, async (tx) => {
    const [party] = await tx.select().from(parties).where(eq(parties.id, partyId)).limit(1);
    if (!party || party.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Tercero no existe." } };

    const current = await tx.select().from(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, partyId));
    for (const p of current) {
      if (p.effectiveRange.endsWith(",)")) {
        const lower = lowerOf(p.effectiveRange);
        if (parsed.data.effectiveFrom <= lower)
          return { ok: false as const, error: { code: "VALIDATION_ERROR", message: `Vigencia debe empezar después de ${lower}.` } };
        await tx
          .update(partyTaxProfiles)
          .set({ effectiveRange: `[${lower},${parsed.data.effectiveFrom})` })
          .where(eq(partyTaxProfiles.id, p.id));
      }
    }
    try {
      const [created] = await tx
        .insert(partyTaxProfiles)
        .values({
          companyId: ctx.companyId,
          partyId,
          tipoPersona: parsed.data.tipoPersona,
          residente: parsed.data.residente,
          condicionIva: parsed.data.condicionIva ?? null,
          sujetoRetencionIva: parsed.data.sujetoRetencionIva,
          sujetoRetencionIslr: parsed.data.sujetoRetencionIslr,
          effectiveRange: `[${parsed.data.effectiveFrom},)`,
        })
        .returning({ id: partyTaxProfiles.id });
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "create", entityType: "party_tax_profile", entityId: created!.id, after: parsed.data }, `tx-profile-${created!.id}`);
      return { ok: true as const, id: created!.id };
    } catch (e) {
      if (typeof e === "object" && e !== null && "code" in e && ((e as { code: unknown }).code === "23P01" || (e as { code: unknown }).code === "23505"))
        return { ok: false as const, error: { code: "OVERLAPPING_PROFILE", message: "Vigencia solapada con otro perfil." } };
      throw e;
    }
  });
}

export async function listParties(ctx: Ctx) {
  return withTenant(ctx, (tx: DrizzleTx) =>
    tx.select().from(parties).where(eq(parties.companyId, ctx.companyId)).limit(200),
  );
}

export async function getPartyWithProfiles(ctx: Ctx, partyId: string) {
  return withTenant(ctx, async (tx) => {
    const [party] = await tx.select().from(parties).where(eq(parties.id, partyId)).limit(1);
    if (!party || party.companyId !== ctx.companyId) return null;
    const profiles = await tx.select().from(partyTaxProfiles).where(eq(partyTaxProfiles.partyId, partyId));
    return { party, profiles: profiles.sort((a, b) => (a.effectiveRange < b.effectiveRange ? -1 : 1)) };
  });
}
