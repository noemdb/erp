import { describe, expect, it } from "vitest";
import { anonRif, anonParty } from "./anonymize";

const SALT = "test-salt";

describe("anonimización S0", () => {
  it("determinista y preserva relaciones", () => {
    expect(anonRif(SALT, "J-12345678-9")).toBe(anonRif(SALT, "J-12345678-9"));
    expect(anonRif(SALT, "J-12345678-9")).not.toBe(anonRif(SALT, "J-87654321-0"));
    expect(anonRif("otra", "J-12345678-9")).not.toBe(anonRif(SALT, "J-12345678-9"));
  });

  it("formato RIF válido y sin datos originales", () => {
    const r = anonRif(SALT, "Proveedor Uno, C.A.");
    expect(r).toMatch(/^[JVE]-\d{8}-\w$/);
    const p = anonParty(SALT, { rif: "J-12345678-9", razon: "Proveedor Uno", direccion: "Caracas" });
    expect(p.razon).not.toContain("Proveedor");
    expect(p.direccion).not.toContain("Caracas");
  });

  it("exige sal", () => {
    expect(() => anonParty("", { rif: "x", razon: "y" })).toThrow(/ANON_SALT/);
  });
});
