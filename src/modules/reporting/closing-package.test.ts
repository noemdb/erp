import { describe, expect, it } from "vitest";
import { buildPackage, sectionSha } from "./closing-package";

describe("paquete de cierre (puro)", () => {
  it("determinista: mismo insumo, mismo hash", () => {
    const sections = [{ kind: "purchase_book", count: 2, sha256: sectionSha("purchase_book", [{ a: 1 }]) }];
    expect(buildPackage("p1", sections, { x: 1 }, { ok: true }).sha256)
      .toBe(buildPackage("p1", sections, { x: 1 }, { ok: true }).sha256);
  });

  it("sensible: una fila cambiada cambia el hash global", () => {
    const a = buildPackage("p1", [{ kind: "iva_withholdings", count: 1, sha256: sectionSha("iva_withholdings", [{ r: "20.00" }]) }], {}, {});
    const b = buildPackage("p1", [{ kind: "iva_withholdings", count: 1, sha256: sectionSha("iva_withholdings", [{ r: "20.01" }]) }], {}, {});
    expect(a.sha256).not.toBe(b.sha256);
  });

  it("vacío: 6 secciones en cero pero hash válido", () => {
    const kinds = ["purchase_book", "sales_book", "iva_summary", "conciliation", "iva_withholdings", "islr_withholdings"];
    const pkg = buildPackage("p1", kinds.map((kind) => ({ kind, count: 0, sha256: sectionSha(kind, []) })), {}, { ok: true, items: [] });
    expect(pkg.sections).toHaveLength(6);
    expect(pkg.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
