import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signGoldenCase, DIR } from "./sign";
import { verifyGolden } from "./verify";

/** Firma file-backed (Opción 1 del spec): se firma sobre una copia en dir temporal. */
describe("signGoldenCase", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "goldens-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("firma con identidad de sesión y hash verificable", () => {
    copyFileSync(join(DIR, "IVA-01-compra-gravada.json"), join(dir, "IVA-01-compra-gravada.json"));
    const res = signGoldenCase("IVA-01", "user-contador", {
      firmanteNombre: "Contador Test",
      firmanteDoc: "V-12345678",
      fuenteLegal: "Providencia SNAT 2025",
    }, dir);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const signed = JSON.parse(readFileSync(join(dir, "IVA-01-compra-gravada.json"), "utf8"));
      expect(signed.estado).toBe("VALIDADO_CONTADOR");
      expect(signed.firma.sha256_contenido).toBe(res.contentSha256);
      expect(signed.firma.firmado_por_user_id).toBe("user-contador");
      expect(signed.firma.algoritmo).toBe("hmac-sha256");
      expect(verifyGolden(signed).firmado).toBe(true);
    }
  });

  it("no vuelve a firmar un dorado ya firmado (GOLDEN_ALREADY_SIGNED)", () => {
    copyFileSync(join(DIR, "IVA-01-compra-gravada.json"), join(dir, "IVA-01-compra-gravada.json"));
    signGoldenCase("IVA-01", "u1", { firmanteNombre: "Contador A", firmanteDoc: "V-11111111", fuenteLegal: "Norma A" }, dir);
    const res = signGoldenCase("IVA-01", "u2", { firmanteNombre: "Contador B", firmanteDoc: "V-22222222", fuenteLegal: "Norma B" }, dir);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("GOLDEN_ALREADY_SIGNED");
  });

  it("no firma un dorado que el motor no reproduce (GOLDEN_NOT_REPRODUCED)", () => {
    writeFileSync(join(dir, "IVA-99.json"), JSON.stringify({
      id: "IVA-99",
      descripcion: "caso con total que no cuadra",
      origen: "sintetico",
      estado: "CANDIDATO",
      doc: { lines: [{ taxCategory: "general", taxRate: "0.16", base: "1000.00" }], total: "9999.00" },
      esperado: { baseImponible: "1000.00", ivaCausado: "160.00", totalValido: true },
    }));
    const res = signGoldenCase("IVA-99", "u1", { firmanteNombre: "Contador A", firmanteDoc: "V-11111111", fuenteLegal: "Norma A" }, dir);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("GOLDEN_NOT_REPRODUCED");
  });
});
