import { describe, it, expect } from "vitest";
import { certSeq, findCorrelativoGaps } from "./correlativo-gaps";

const row = (certificateNumber: string, status = "issued") => ({ certificateNumber, status, totalRetained: "10.00" });

describe("correlativo (puro)", () => {
  it("parte prefijo + secuencia", () => {
    expect(certSeq("20260100000001", 8)).toEqual({ prefix: "202601", seq: 1 });
    expect(certSeq("ISLR-202601-Q1-000001", 6)).toEqual({ prefix: "ISLR-202601-Q1-", seq: 1 });
    expect(certSeq("202601-Q100000007", 8)).toEqual({ prefix: "202601-Q1", seq: 7 });
    expect(certSeq("corto", 8)).toBeNull();
    expect(certSeq("", 8)).toBeNull();
  });

  it("sin huecos en secuencia completa", () => {
    const g = findCorrelativoGaps([row("20260100000001"), row("20260100000002"), row("20260100000003")], 8);
    expect(g.faltantesTotal).toBe(0);
    expect(g.groups).toHaveLength(1);
    expect(g.groups[0]).toMatchObject({ prefix: "202601", desde: "20260100000001", hasta: "20260100000003" });
  });

  it("detecta el número faltante", () => {
    const g = findCorrelativoGaps([row("20260100000001"), row("20260100000003")], 8);
    expect(g.faltantesTotal).toBe(1);
    expect(g.groups[0]!.faltantes).toEqual(["20260100000002"]);
  });

  it("anulado cuenta como consumido, no es hueco", () => {
    const g = findCorrelativoGaps([row("20260100000001"), row("20260100000002", "voided"), row("20260100000003")], 8);
    expect(g.faltantesTotal).toBe(0);
  });

  it("Q1 y Q2 son series independientes", () => {
    const g = findCorrelativoGaps([row("202601-Q100000001"), row("202601-Q100000003"), row("202601-Q200000001")], 8);
    expect(g.groups).toHaveLength(2);
    expect(g.faltantesTotal).toBe(1);
  });

  it("ISLR usa 6 dígitos", () => {
    const g = findCorrelativoGaps([row("ISLR-202601-Q1-000001"), row("ISLR-202601-Q1-000003")], 6);
    expect(g.groups[0]!.faltantes).toEqual(["ISLR-202601-Q1-000002"]);
  });

  it("certificados raros se informan, no se ignoran", () => {
    const g = findCorrelativoGaps([row("20260100000001"), row("SIN-FORMATO")], 8);
    expect(g.noComparables).toEqual(["SIN-FORMATO"]);
    expect(g.faltantesTotal).toBe(0);
  });
});
