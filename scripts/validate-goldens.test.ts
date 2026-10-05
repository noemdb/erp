import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { canonical, verifyFirma } from "./validate-goldens.mjs";
import { gateCanonical } from "@/modules/rules/activation-gate";

const base = {
  id: "IVA-99",
  descripcion: "Caso de prueba de firma ligada al contenido",
  origen: "sintetico",
  estado: "VALIDADO_CONTADOR",
  esperado: { retencion: "120.00" },
};

function firmada(s: Record<string, unknown>) {
  const { firma: _omit, ...sinFirma } = s;
  void _omit;
  const hash = createHash("sha256").update(canonical(sinFirma)).digest("hex");
  return { ...s, firma: { firmado_por: "Contador Test", fecha: "2026-10-04", fuente_legal: "test", sha256_contenido: hash } };
}

/** ACC-02: la firma va ligada al hash del contenido, no es un sello decorativo. */
describe("firma de dorados ligada al contenido", () => {
  it("acepta fixture VALIDADO con hash correcto", () => {
    expect(verifyFirma(firmada(base)).firmado).toBe(true);
  });
  it("rechaza hash manipulado", () => {
    const s = firmada(base) as Record<string, unknown>;
    const mutada = { ...s, esperado: { retencion: "999.00" } };
    const v = verifyFirma(mutada);
    expect(v.firmado).toBe(false);
    expect(v.error).toMatch(/no coincide/);
  });
  it("rechaza VALIDADO sin sha256_contenido", () => {
    const v = verifyFirma({ ...base, firma: { firmado_por: "X", fecha: "2026-10-04", fuente_legal: "test" } });
    expect(v.firmado).toBe(false);
  });
  it("no cuenta CANDIDATO como firmado ni lo rechaza", () => {
    expect(verifyFirma({ ...base, estado: "CANDIDATO" })).toEqual({ firmado: false });
  });
  it("canónico: el orden de claves no cambia el hash", () => {
    const a = canonical({ x: "1", y: { b: "2", a: "3" } });
    const b = canonical({ y: { a: "3", b: "2" }, x: "1" });
    expect(a).toBe(b);
  });
  it("paridad ACC-03: gateCanonical == canonical (misma firma en ambos)", () => {
    const v = { id: "X", n: "1.00", arr: [{ b: "2", a: "1" }], nest: { z: "0", a: "9" } };
    expect(gateCanonical(v)).toBe(canonical(v));
  });
});
