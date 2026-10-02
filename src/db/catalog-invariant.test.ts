import { describe, expect, it } from "vitest";
import { db } from "./client";

/**
 * 2.0.5 §3.2: invariante de catálogo. Toda tabla con company_id tiene RLS
 * habilitada y ≥1 política; si una migración futura la rompe, esto falla.
 * Requiere rol con lectura de catálogo (owner en dev).
 */
describe("invariante de catálogo RLS", () => {
  // Excepción documentada (DATABASE.md): acceso por join a membresía en app.
  const EXCEPT = new Set(["company_user"]);
  it("toda tabla con company_id tiene RLS + política", async () => {
    const tables = (await db.execute(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)) as unknown as { tablename: string }[];
    const names = tables.map((t) => t.tablename);
    const withoutRls: string[] = [];
    const withoutPolicy: string[] = [];
    for (const name of names) {
      if (EXCEPT.has(name)) continue;
      const cols = (await db.execute(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${name}' AND column_name='company_id'`)) as unknown[];
      if (cols.length === 0) continue;
      const rls = (await db.execute(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='${name}'`)) as unknown as { relrowsecurity: boolean }[];
      if (!rls[0]?.relrowsecurity) withoutRls.push(name);
      const pol = (await db.execute(`SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='${name}'`)) as unknown[];
      if (pol.length === 0) withoutPolicy.push(name);
    }
    expect({ withoutRls, withoutPolicy }).toEqual({ withoutRls: [], withoutPolicy: [] });
  });
});
