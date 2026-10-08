import { describe, expect, it } from "vitest";
import { canonical, contentHash } from "./canonical";
import { gateCanonical } from "@/modules/rules/activation-gate";
import { rdfCanonical } from "@/modules/rdf/canonical";

/** Fase 0.2 del spec `blueprint/goldenValidation/`: un solo canon en todo el proyecto (cierra D9). */
describe("canon único", () => {
  const v = { id: "X", n: "1.00", arr: [{ b: "2", a: "1" }], nest: { z: "0", a: "9" } };

  it("mismo contenido → mismo hash, 100 corridas (pur-01)", () => {
    const h = contentHash(v);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    for (let i = 0; i < 100; i++) expect(contentHash(v)).toBe(h);
  });

  it("cambiar una clave cambia el hash (pur-02)", () => {
    expect(contentHash({ a: "1" })).not.toBe(contentHash({ a: "2" }));
  });

  it("reordenar claves no cambia el hash (pur-03)", () => {
    expect(canonical({ b: 1, a: { d: 4, c: 3 } })).toBe(canonical({ a: { c: 3, d: 4 }, b: 1 }));
    expect(contentHash({ b: 1, a: 2 })).toBe(contentHash({ a: 2, b: 1 }));
  });

  it("rdfCanonical y gateCanonical son el canon compartido (pur-09, cierra D9)", () => {
    expect(rdfCanonical(v)).toBe(canonical(v));
    expect(gateCanonical(v)).toBe(canonical(v));
  });
});
