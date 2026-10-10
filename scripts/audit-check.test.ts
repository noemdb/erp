import { describe, expect, it } from "vitest";
import { checkAudit, advisoryMap } from "./audit-check.mjs";

const auditOf = (vulns: Record<string, { severity: string }>) => ({ vulnerabilities: vulns });
const base = {
  tinypool: "critical",
  vite: "high",
  esbuild: "moderate",
};

describe("audit-check (B40)", () => {
  it("pasa con solo baseline (sin nuevas)", () => {
    const r = checkAudit(auditOf({ tinypool: { severity: "critical" }, vite: { severity: "high" }, esbuild: { severity: "moderate" } }), base);
    expect(r.ok).toBe(true);
    expect(r.total).toBe(3);
    expect(r.fresh).toEqual([]);
  });
  it("falla ante critical/high nueva", () => {
    const r = checkAudit(auditOf({ tinypool: { severity: "critical" }, lodash: { severity: "high" } }), base);
    expect(r.ok).toBe(false);
    expect(r.fresh).toEqual(["lodash (high)"]);
  });
  it("falla si una baseline sube de severidad", () => {
    const r = checkAudit(auditOf({ vite: { severity: "critical" } }), base);
    expect(r.ok).toBe(false);
    expect(r.fresh).toEqual(["vite (high→critical)"]);
  });
  it("moderate/low nueva solo avisa, no falla", () => {
    const r = checkAudit(auditOf({ tinypool: { severity: "critical" }, leftpad: { severity: "moderate" } }), base);
    expect(r.ok).toBe(true);
    expect(r.freshLow).toEqual(["leftpad (moderate)"]);
  });
  it("reporta resueltas sin fallar", () => {
    const r = checkAudit(auditOf({ tinypool: { severity: "critical" } }), base);
    expect(r.ok).toBe(true);
    expect(r.resolved).toEqual(["vite", "esbuild"]);
  });
  it("advisoryMap extrae severidades", () => {
    expect(advisoryMap(auditOf({ a: { severity: "high" } }))).toEqual({ a: "high" });
  });
});
