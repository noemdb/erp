import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

vi.mock("@/modules/rules/activation-gate", () => ({
  checkActivationGate: () => ({ ok: true, corridos: 1 }),
  loadSignedScenarios: () => [],
}));
import { db } from "@/db/client";
import { users, companies, companyUser, auditEvents, withholdingRules, fiscalDecisions, fiscalDecisionLinks, rdfSeries } from "@/db/schema";
import {
  createDecision, updateDraft, submitDecision, approveDecision, signDecision, getDecision, listDecisions,
} from "./service";
import { createDraft, submitRule, approveRule, activateRule } from "@/modules/rules/service";
import { linkDecisionToRule } from "./links";

const s = randomUUID().slice(0, 8);

async function setup() {
  const [u] = await db.insert(users).values({ email: `rdf-${s}@test.local`, passwordHash: "x", name: "R" }).returning({ id: users.id });
  const [c] = await db.insert(companies).values({ rif: `J-49${s}-A`, rifOriginal: `J-49${s}-A`, razonSocial: "RDF CA", condicionIva: "ordinario" }).returning({ id: companies.id });
  await db.insert(companyUser).values({ companyId: c!.id, userId: u!.id, role: "contador" });
  return { ctx: { companyId: c!.id, userId: u!.id }, companyId: c!.id, userId: u!.id };
}

async function cleanup(companyId: string, userId: string) {
  await db.delete(fiscalDecisionLinks).where(eq(fiscalDecisionLinks.companyId, companyId));
  await db.delete(fiscalDecisions).where(eq(fiscalDecisions.companyId, companyId));
  await db.delete(withholdingRules).where(eq(withholdingRules.companyScopeKey, companyId));
  await db.delete(rdfSeries).where(eq(rdfSeries.companyId, companyId));
  await db.delete(auditEvents).where(eq(auditEvents.companyId, companyId));
  await db.delete(companyUser).where(eq(companyUser.companyId, companyId));
  await db.delete(companies).where(eq(companies.id, companyId));
  await db.delete(users).where(eq(users.id, userId));
}

const draftInput = {
  gap: "G8" as const,
  titulo: "Redondeo por línea o por total",
  pregunta: "¿El 75 % se redondea línea por línea o sobre el total?",
  alternativas: [
    { letra: "A", descripcion: "Redondeo por línea con HALF_UP a 2 decimales y luego se suma", impacto_numerico: "1179.12" },
    { letra: "B", descripcion: "Suma exacta y redondeo del total al final", impacto_numerico: "1179.11" },
  ],
  ruleKind: "iva" as const,
};

const fillInput = {
  decision: "Se redondea por línea con HALF_UP a 2 decimales y luego se suma.",
  fundamentoNormativo: "Criterio del contador del 2026-10-06: etapa por línea.",
  ejemploNumerico: { base: "1572.15", porcentaje: "0.75" },
  resultadoEsperado: "1179.12",
};

async function makeSigned(ctx: { companyId: string; userId: string }) {
  const c = await createDecision(ctx, draftInput);
  expect(c.ok).toBe(true);
  if (!c.ok) throw new Error("setup create");
  await updateDraft(ctx, c.id, fillInput);
  const sub = await submitDecision(ctx, c.id);
  expect(sub.ok).toBe(true);
  const app = await approveDecision(ctx, c.id);
  expect(app.ok).toBe(true);
  const sign = await signDecision(ctx, c.id, { firmanteNombre: "Contador Test", firmanteDoc: "V-12345678" });
  expect(sign.ok).toBe(true);
  if (!sign.ok) throw new Error("setup sign");
  return { id: c.id, codigo: c.codigo, sha: sign.contentSha256 };
}

describe("RDF decisiones fiscales", () => {
  it("borrador→revisión→aprobación→firma con sha256; firmada inmutable y no visible cross-empresa", async () => {
    const { ctx, companyId, userId } = await setup();
    try {
      const c = await createDecision(ctx, draftInput);
      expect(c.ok).toBe(true);
      if (!c.ok) throw new Error("setup");
      expect(c.codigo).toMatch(/^RDF-\d{4}-\d{4}$/);

      // Sin completar no se envía a revisión.
      expect((await submitDecision(ctx, c.id)).ok).toBe(false);
      expect((await updateDraft(ctx, c.id, fillInput)).ok).toBe(true);
      expect((await submitDecision(ctx, c.id)).ok).toBe(true);
      const app = await approveDecision(ctx, c.id);
      expect(app.ok).toBe(true);

      const sign = await signDecision(ctx, c.id, { firmanteNombre: "Contador Test", firmanteDoc: "V-12345678" });
      expect(sign.ok).toBe(true);
      if (!sign.ok) throw new Error("sign");
      expect(sign.contentSha256).toMatch(/^[0-9a-f]{64}$/);

      // Firmada: edición bloqueada en app...
      const edit = await updateDraft(ctx, c.id, { decision: "Otra cosa completamente distinta" });
      expect(edit.ok).toBe(false);
      // ...y en DB aunque se intente directo (trigger rdf_immutable).
      await expect(
        (async () => {
          const { withTenant } = await import("@/modules/tenancy/with-tenant");
          await withTenant(ctx, (tx) => tx.update(fiscalDecisions).set({ titulo: "hack" }).where(eq(fiscalDecisions.id, c.id)));
        })(),
      ).rejects.toThrow();

      // Fuga: otra empresa no la ve.
      const [u2] = await db.insert(users).values({ email: `rdf2-${s}@test.local`, passwordHash: "x", name: "X" }).returning({ id: users.id });
      const [c2] = await db.insert(companies).values({ rif: `J-50${s}-A`, rifOriginal: `J-50${s}-A`, razonSocial: "Otra CA", condicionIva: "ordinario" }).returning({ id: companies.id });
      await db.insert(companyUser).values({ companyId: c2!.id, userId: u2!.id, role: "contador" });
      try {
        expect(await getDecision({ companyId: c2!.id, userId: u2!.id }, c.id)).toBeNull();
        expect((await listDecisions({ companyId: c2!.id, userId: u2!.id })).length).toBe(0);
      } finally {
        await db.delete(companyUser).where(eq(companyUser.companyId, c2!.id));
        await db.delete(companies).where(eq(companies.id, c2!.id));
        await db.delete(users).where(eq(users.id, u2!.id));
      }
    } finally {
      await cleanup(companyId, userId);
    }
  });

  it("códigos concurrentes únicos (10 reservas paralelas)", async () => {
    const { ctx, companyId, userId } = await setup();
    try {
      const results = await Promise.all(Array.from({ length: 10 }, () => createDecision(ctx, draftInput)));
      expect(results.every((r) => r.ok)).toBe(true);
      const codigos = results.filter((r) => r.ok).map((r) => r.codigo);
      expect(new Set(codigos).size).toBe(10);
    } finally {
      await cleanup(companyId, userId);
    }
  });

  it("GATE_NO_RDF: regla no sintética no activa sin RDF vinculado; con vínculo activa y marca applied", async () => {
    const { ctx, companyId, userId } = await setup();
    try {
      const d = await createDraft(ctx, { ruleKind: "iva", baseFormulaKind: "iva_causado", legalReference: "Providencia X", changeReason: "rdf", effectiveFrom: "2026-01-01", porcentaje: "0.75" });
      expect(d.ok).toBe(true);
      if (!d.ok) throw new Error("setup rule");
      await submitRule(ctx, d.id);
      await approveRule(ctx, d.id);

      const sinRdf = await activateRule(ctx, d.id);
      expect(sinRdf.ok).toBe(false);
      if (!sinRdf.ok) expect(sinRdf.error.code).toBe("GATE_NO_RDF");

      const { id } = await makeSigned(ctx);
      const link = await linkDecisionToRule(ctx, id, { ruleId: d.id, rol: "autoriza" });
      expect(link.ok).toBe(true);

      const conRdf = await activateRule(ctx, d.id);
      expect(conRdf.ok).toBe(true);

      const got = await getDecision(ctx, id);
      expect(got?.decision.status).toBe("applied");
    } finally {
      await cleanup(companyId, userId);
    }
  });
});
