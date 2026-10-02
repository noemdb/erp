import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant } from "./with-tenant";
import { record } from "@/modules/audit/record";
import { companies, branches, fiscalMachines } from "@/db/schema";

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
