import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { withTenant } from "./with-tenant";
import { record } from "@/modules/audit/record";
import { companies, branches, fiscalMachines, fiscalPeriods } from "@/db/schema";

export type Ctx = { companyId: string; userId: string };

/** G7: fuente del Libro de Ventas por empresa. Sin mezcla por período (control F8). */
export async function setSalesMode(ctx: Ctx, mode: string) {
  if (mode !== "invoices" && mode !== "z")
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Modo inválido." } };
  return withTenant(ctx, async (tx) => {
    const [before] = await tx.select().from(companies).where(eq(companies.id, ctx.companyId)).limit(1);
    await tx.update(companies).set({ salesMode: mode, updatedAt: new Date() }).where(eq(companies.id, ctx.companyId));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "config", entityType: "company", entityId: ctx.companyId, before: { salesMode: before?.salesMode }, after: { salesMode: mode }, reason: "G7 modo libro de ventas" }, `tx-config-${ctx.companyId}`);
    return { ok: true as const };
  });
}

/** Ata una máquina fiscal a una sucursal (o la libera con branchId null). */
export async function assignMachineBranch(ctx: Ctx, machineId: string, branchId: string | null) {
  return withTenant(ctx, async (tx) => {
    const [m] = await tx.select().from(fiscalMachines).where(eq(fiscalMachines.id, machineId)).limit(1);
    if (!m || m.companyId !== ctx.companyId) return { ok: false as const, error: { code: "NOT_FOUND", message: "Máquina no existe." } };
    if (branchId) {
      const [b] = await tx.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.companyId, ctx.companyId))).limit(1);
      if (!b) return { ok: false as const, error: { code: "NOT_FOUND", message: "Sucursal no existe." } };
    }
    await tx.update(fiscalMachines).set({ branchId }).where(eq(fiscalMachines.id, machineId));
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "config", entityType: "fiscal_machine", entityId: machineId, after: { branchId } }, `tx-machine-${machineId}`);
    return { ok: true as const };
  });
}

export async function listMachines(ctx: Ctx) {
  return withTenant(ctx, async (tx) => {
    const ms = await tx.select().from(fiscalMachines).where(eq(fiscalMachines.companyId, ctx.companyId)).limit(100);
    const bs = await tx.select().from(branches).where(eq(branches.companyId, ctx.companyId)).limit(100);
    const byId = new Map(bs.map((b) => [b.id, b.nombre]));
    return { machines: ms.map((m) => ({ ...m, branchNombre: m.branchId ? byId.get(m.branchId) ?? "—" : "—" })), branches: bs };
  });
}

export async function getSalesMode(ctx: Ctx): Promise<string> {
  return withTenant(ctx, async (tx) => {
    const [c] = await tx.select().from(companies).where(eq(companies.id, ctx.companyId)).limit(1);
    return c?.salesMode ?? "invoices";
  });
}

export const FiscalProfileSchema = z.object({
  condicionIva: z.enum(["ordinario", "especial", "exento", "no_contribuyente"]),
  contribuyenteEspecialDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD).").nullable().optional(),
  agenteRetencionIva: z.boolean().default(false),
  agenteRetencionIslr: z.boolean().default(false),
  periodKind: z.enum(["monthly", "biweekly"]),
});

export type FiscalProfileResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string } };

/**
 * Perfil fiscal de la empresa (DOMAIN empresa). Solo admin (API.md).
 * period_kind inmutable si existen períodos cerrados.
 */
export async function updateFiscalProfile(ctx: Ctx, raw: z.input<typeof FiscalProfileSchema>): Promise<FiscalProfileResult> {
  const parsed = FiscalProfileSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  return withTenant(ctx, async (tx) => {
    const [before] = await tx.select().from(companies).where(eq(companies.id, ctx.companyId)).limit(1);
    if (!before)
      return { ok: false as const, error: { code: "NOT_FOUND", message: "Empresa no existe." } };
    if (parsed.data.periodKind !== before.periodKind) {
      const closed = await tx
        .select({ id: fiscalPeriods.id })
        .from(fiscalPeriods)
        .where(and(eq(fiscalPeriods.companyId, ctx.companyId), inArray(fiscalPeriods.status, ["closed", "reopened"])))
        .limit(1);
      if (closed.length > 0)
        return {
          ok: false as const,
          error: { code: "VALIDATION_ERROR", message: "period_kind inmutable con períodos cerrados (requiere ADR)." },
        };
    }
    const after = {
      condicionIva: parsed.data.condicionIva,
      contribuyenteEspecialDesde: parsed.data.contribuyenteEspecialDesde ?? null,
      agenteRetencionIva: parsed.data.agenteRetencionIva,
      agenteRetencionIslr: parsed.data.agenteRetencionIslr,
      periodKind: parsed.data.periodKind,
      updatedAt: new Date(),
    };
    await tx.update(companies).set(after).where(eq(companies.id, ctx.companyId));
    await record(
      tx,
      {
        companyId: ctx.companyId, actorUserId: ctx.userId, action: "config", entityType: "company",
        entityId: ctx.companyId,
        before: {
          condicionIva: before.condicionIva, contribuyenteEspecialDesde: before.contribuyenteEspecialDesde,
          agenteRetencionIva: before.agenteRetencionIva, agenteRetencionIslr: before.agenteRetencionIslr,
          periodKind: before.periodKind,
        },
        after, reason: "perfil fiscal empresa",
      },
      `tx-config-fiscal-${ctx.companyId}`
    );
    return { ok: true as const };
  });
}
