import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withTenant } from "@/modules/tenancy/with-tenant";
import { record } from "@/modules/audit/record";
import { fiscalObligations, fiscalHolidays, ivaWithholdings, islrWithholdings } from "@/db/schema";

export type Ctx = { companyId: string; userId: string };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parse(s: string): Date {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, dd));
}

/** Suma días hábiles (lun–vie menos feriados). Pura y testeable. */
export function addBusinessDays(fromISO: string, n: number, holidays: Set<string>): string {
  const d = parse(fromISO);
  let added = 0;
  // El día base no cuenta: el "primer día hábil" es el siguiente hábil.
  for (;;) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6 || holidays.has(iso(d))) continue;
    added++;
    if (added >= n) return iso(d);
  }
}

/** Primer día del período siguiente (mensual). */
export function nextPeriodStart(fechaEvento: string): string {
  const [y, m] = fechaEvento.split("-").map(Number);
  return m === 12 ? `${y! + 1}-01-01` : `${y}-${String(m! + 1).padStart(2, "0")}-01`;
}

/**
 * Fecha límite = enésimo día hábil del período siguiente (fórmula documentada;
 * el contador define N, fuente y vigencia; sin obligación no hay fecha).
 */
export function computeDue(fechaEvento: string, diasHabiles: number, holidays: Set<string>): string {
  return addBusinessDays(nextPeriodStart(fechaEvento), diasHabiles - 1, holidays);
}

export type AlertState = "sin_regla" | "dentro" | "proximo" | "hoy" | "vencido" | "entregado";

export function alertState(dueISO: string | null, delivered: boolean, todayISO: string): AlertState {
  if (delivered) return "entregado";
  if (!dueISO) return "sin_regla";
  if (todayISO > dueISO) return "vencido";
  if (todayISO === dueISO) return "hoy";
  const diffDays = Math.round((parse(dueISO).getTime() - parse(todayISO).getTime()) / 86400000);
  // Días calendario al límite como aproximación de "próximo" (los hábiles ya están en el cálculo).
  return diffDays <= 5 ? "proximo" : "dentro";
}

export const ObligationSchema = z.object({
  kind: z.string().min(1).max(50),
  fuenteNormativa: z.string().min(3).max(300),
  articulo: z.string().min(1).max(100),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  diasHabiles: z.number().int().min(1).max(30),
});

export async function upsertObligation(ctx: Ctx, raw: z.input<typeof ObligationSchema>) {
  const parsed = ObligationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message } };
  return withTenant(ctx, async (tx) => {
    const found = await tx.select().from(fiscalObligations).where(
      and(eq(fiscalObligations.companyId, ctx.companyId), eq(fiscalObligations.kind, parsed.data.kind)),
    ).limit(1);
    const values = {
      fuenteNormativa: parsed.data.fuenteNormativa, articulo: parsed.data.articulo,
      effectiveRange: `[${parsed.data.effectiveFrom},)`, diasHabiles: parsed.data.diasHabiles, status: "active",
    };
    if (found[0]) {
      await tx.update(fiscalObligations).set(values).where(eq(fiscalObligations.id, found[0].id));
      await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "update", entityType: "fiscal_obligation", entityId: found[0].id, after: values }, `tx-ob-${found[0].id}`);
      return { ok: true as const, id: found[0].id };
    }
    const [row] = await tx.insert(fiscalObligations).values({ companyId: ctx.companyId, kind: parsed.data.kind, ...values }).returning({ id: fiscalObligations.id });
    await record(tx, { companyId: ctx.companyId, actorUserId: ctx.userId, action: "create", entityType: "fiscal_obligation", entityId: row!.id, after: values }, `tx-ob-${row!.id}`);
    return { ok: true as const, id: row!.id };
  });
}

export async function addHoliday(ctx: Ctx, fecha: string, descripcion?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false as const, error: { code: "VALIDATION_ERROR", message: "Fecha inválida." } };
  return withTenant(ctx, async (tx) => {
    const dup = await tx.select().from(fiscalHolidays).where(and(eq(fiscalHolidays.companyId, ctx.companyId), eq(fiscalHolidays.fecha, fecha))).limit(1);
    if (dup.length > 0) return { ok: false as const, error: { code: "DUPLICATE_DOCUMENT", message: "Feriado ya existe." } };
    const [row] = await tx.insert(fiscalHolidays).values({ companyId: ctx.companyId, fecha, descripcion: descripcion ?? null }).returning({ id: fiscalHolidays.id });
    return { ok: true as const, id: row!.id };
  });
}

export async function listObligations(ctx: Ctx) {
  return withTenant(ctx, (tx) => tx.select().from(fiscalObligations).where(eq(fiscalObligations.companyId, ctx.companyId)).limit(50));
}

export async function listHolidays(ctx: Ctx) {
  return withTenant(ctx, (tx) => tx.select().from(fiscalHolidays).where(eq(fiscalHolidays.companyId, ctx.companyId)).limit(200));
}

export type Alert = { id: string; kind: string; certificate: string; fechaEmision: string; due: string | null; state: AlertState };

/** Tablero: comprobantes emitidos no entregados con su estado (las alertas no cambian estado fiscal). */
export async function getAlerts(ctx: Ctx, todayISO: string): Promise<Alert[]> {
  return withTenant(ctx, async (tx) => {
    const holidays = new Set((await tx.select().from(fiscalHolidays).where(eq(fiscalHolidays.companyId, ctx.companyId))).map((h) => h.fecha));
    const obs = await tx.select().from(fiscalObligations).where(eq(fiscalObligations.companyId, ctx.companyId));
    const byKind = new Map(obs.filter((o) => o.status === "active").map((o) => [o.kind, o]));
    const out: Alert[] = [];
    const iva = await tx.select().from(ivaWithholdings).where(eq(ivaWithholdings.companyId, ctx.companyId));
    for (const w of iva.filter((x) => x.status === "issued" || x.status === "delivered")) {
      const ob = byKind.get("iva_entrega");
      const due = ob && w.fechaEmision ? computeDue(w.fechaEmision, ob.diasHabiles, holidays) : null;
      out.push({ id: w.id, kind: "iva", certificate: w.certificateNumber, fechaEmision: w.fechaEmision ?? "", due, state: alertState(due, w.status === "delivered", todayISO) });
    }
    const islr = await tx.select().from(islrWithholdings).where(eq(islrWithholdings.companyId, ctx.companyId));
    for (const w of islr.filter((x) => x.status === "issued" || x.status === "delivered")) {
      const ob = byKind.get("islr_entrega");
      const due = ob && w.fechaEmision ? computeDue(w.fechaEmision, ob.diasHabiles, holidays) : null;
      out.push({ id: w.id, kind: "islr", certificate: w.certificateNumber, fechaEmision: w.fechaEmision ?? "", due, state: alertState(due, w.status === "delivered", todayISO) });
    }
    return out;
  });
}
