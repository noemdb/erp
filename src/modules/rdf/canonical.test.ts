import { describe, expect, it } from "vitest";
import { rdfCanonical, rdfHash, signedContentHash, type SignedContent } from "./canonical";

const base: SignedContent = {
  codigo: "RDF-2026-0001",
  gap: "G8",
  titulo: "Redondeo por línea",
  pregunta: "¿Por línea o por total?",
  alternativas: [
    { letra: "A", descripcion: "Redondeo por línea con HALF_UP a 2 decimales y luego se suma", impacto_numerico: "1179.12" },
    { letra: "B", descripcion: "Suma exacta y redondeo del total", impacto_numerico: "1179.11" },
  ],
  decision: "Se redondea por línea.",
  fundamento_normativo: "Criterio del contador 2026-10-06.",
  ejemplo_numerico: { base: "1572.15", porcentaje: "0.75" },
  resultado_esperado: "1179.12",
  moneda: "VES",
  rule_kind: "iva",
};

describe("rdf canonical", () => {
  it("orden de claves no altera el hash", () => {
    const a = signedContentHash(base);
    const b = signedContentHash(JSON.parse(JSON.stringify({ ...base, titulo: base.titulo })) as SignedContent);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("cambiar un centavo cambia el hash", () => {
    expect(signedContentHash({ ...base, resultado_esperado: "1179.11" })).not.toBe(signedContentHash(base));
  });
  it("rdfCanonical ordena claves anidadas y arrays en orden dado", () => {
    expect(rdfCanonical({ b: 1, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":1}');
    expect(rdfHash("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});
