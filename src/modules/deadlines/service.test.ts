import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, companies, companyUser, fiscalObligations, fiscalHolidays, auditEvents } from "@/db/schema";
import { addBusinessDays, nextPeriodStart, computeDue, alertState, upsertObligation, addHoliday, getAlerts } from "./service";

describe("plazos", () => {
  it("días hábiles saltan finde y feriados; límite = enésimo día del período siguiente", () => {
    const hols = new Set(["2026-10-12"]);
    expect(nextPeriodStart("2026-09-20")).toBe("2026-10-01");
    // 1 oct 2026 = jueves → 2.º día hábil = vie 2 oct
    expect(computeDue("2026-09-20", 2, new Set())).toBe("2026-10-02");
    // vie 2 es feriado → lun 5
    expect(computeDue("2026-09-20", 2, new Set(["2026-10-02"]))).toBe("2026-10-05");
    expect(addBusinessDays("2026-10-02", 1, hols)).toBe("2026-10-05"); // vie → lun
    expect(alertState("2026-10-02", false, "2026-10-03")).toBe("vencido");
    expect(alertState("2026-10-02", false, "2026-10-02")).toBe("hoy");
    expect(alertState("2026-10-06", false, "2026-10-02")).toBe("proximo");
    expect(alertState("2026-11-02", false, "2026-10-02")).toBe("dentro");
    expect(alertState("2026-10-02", true, "2026-10-05")).toBe("entregado");
    expect(alertState(null, false, "2026-10-02")).toBe("sin_regla");
  });

  it("obligación + feriado + alerta sin regla por defecto", async () => {
    const [u] = await db.insert(users).values({ email: `pl-${randomUUID().slice(0, 8)}@test.local`, passwordHash: "x", name: "P" }).returning({ id: users.id });
    const [c] = await db.insert(companies).values({ rif: `J-49${randomUUID().slice(0, 8)}-A`, rifOriginal: "x", razonSocial: "Pl CA", condicionIva: "ordinario" }).returning({ id: companies.id });
    await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
    const ctx = { companyId: c!.id, userId: u!.id };
    try {
      // sin obligaciones: tablero vacío, sin fechas inventadas
      expect(await getAlerts(ctx, "2026-10-05")).toEqual([]);
      const ob = await upsertObligation(ctx, { kind: "iva_entrega", fuenteNormativa: "Providencia X", articulo: "16", effectiveFrom: "2026-01-01", diasHabiles: 2 });
      expect(ob.ok).toBe(true);
      expect((await addHoliday(ctx, "2026-10-02", "Feriado")).ok).toBe(true);
      expect((await addHoliday(ctx, "2026-10-02")).ok).toBe(false); // duplicado
    } finally {
      await db.delete(fiscalHolidays).where(eq(fiscalHolidays.companyId, c!.id));
      await db.delete(fiscalObligations).where(eq(fiscalObligations.companyId, c!.id));
      await db.delete(auditEvents).where(eq(auditEvents.companyId, c!.id));
      await db.delete(companyUser).where(eq(companyUser.companyId, c!.id));
      await db.delete(companies).where(eq(companies.id, c!.id));
      await db.delete(users).where(eq(users.id, u!.id));
    }
  });
});
