import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderPurchaseBookHtml, renderIvaCertificateHtml, TEMPLATE_VERSIONS } from "./render";
import { compareWorkbooks, buildSampleWorkbook, normValue, canonicalRows, applyApprovals, sanitizeCell, formatReport, parseDecisions, buildBitacora, formatBitacora, bitacoraCsv, inspectGolden } from "./excel-compare";

describe("evidencias 1.0.3 (infra; gate con golden real)", () => {
  it("HTML versionado es determinista y cambia con los datos", () => {
    const meta = { empresa: "Demo", periodo: "2026-09" };
    const rows = [{ fechaFiscal: "2026-09-05", rif: "J-1", razonSocial: "P", docNumber: "F-1", controlNumber: "C-1", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00" }];
    const a = renderPurchaseBookHtml(meta, rows);
    const b = renderPurchaseBookHtml(meta, rows);
    expect(a.sha256).toBe(b.sha256);
    expect(a.html).toContain(TEMPLATE_VERSIONS.purchaseBook);
    const c = renderPurchaseBookHtml(meta, []);
    expect(c.sha256).not.toBe(a.sha256);
    const cert = renderIvaCertificateHtml({ certificateNumber: "20260900000001", fechaEmision: "2026-09-20", agente: "A", beneficiario: "B", lines: [{ invoiceNumber: "F-1", controlNumber: "C-1", taxableBase: "100.00", vatAmount: "16.00", retainedAmount: "12.00" }], total: "12.00" });
    expect(cert.html).toContain("20260900000001");
  });

  it("comparador: idénticos 0 diffs; valor→VALOR; formato→FORMATO; hoja→ESTRUCTURA", async () => {
    const base = [
      { sheet: "Libro", addr: "A1", value: "LIBRO DE COMPRAS" },
      { sheet: "Libro", addr: "B2", value: 120, numFmt: '#,##0.00' },
    ];
    const g = await buildSampleWorkbook(base);
    const same = await buildSampleWorkbook(base);
    expect((await compareWorkbooks(g, same)).diffs).toEqual([]);

    const modVal = await buildSampleWorkbook([
      { sheet: "Libro", addr: "A1", value: "LIBRO DE COMPRAS" },
      { sheet: "Libro", addr: "B2", value: 121, numFmt: '#,##0.00' },
    ]);
    const d1 = await compareWorkbooks(g, modVal);
    expect(d1.diffs).toHaveLength(1);
    expect(d1.diffs[0]!.kind).toBe("VALOR");

    const modFmt = await buildSampleWorkbook([
      { sheet: "Libro", addr: "A1", value: "LIBRO DE COMPRAS" },
      { sheet: "Libro", addr: "B2", value: 120, numFmt: '0.00%' },
    ]);
    const d2 = await compareWorkbooks(g, modFmt);
    expect(d2.diffs).toHaveLength(1);
    expect(d2.diffs[0]!.kind).toBe("FORMATO");

    const modSheet = await buildSampleWorkbook([
      { sheet: "Libro", addr: "A1", value: "LIBRO DE COMPRAS" },
      { sheet: "Libro", addr: "B2", value: 120, numFmt: '#,##0.00' },
      { sheet: "Otra", addr: "A1", value: "x" },
    ]);
    const d3 = await compareWorkbooks(g, modSheet);
    expect(d3.diffs.some((d) => d.kind === "ESTRUCTURA")).toBe(true);
  });

  it("2.A: normalización, orden canónico, aprobadas, sanitización e informe", async () => {
    expect(normValue("1.234,56")).toBe("1234.56");
    expect(normValue("j-12345678-9")).toBe("J-12345678-9");
    expect(normValue("")).not.toBe(normValue("0")); // vacío ≠ cero
    // Serial Excel 46270 = 2026-09-05
    expect(normValue("46270")).toBe("2026-09-05");
    expect(canonicalRows([["b", "2"], ["a", "1"]], [0])).toEqual([["a", "1"], ["b", "2"]]);
    expect(sanitizeCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCell("F-1")).toBe("F-1");

    const base = [{ sheet: "L", addr: "A1", value: "X", numFmt: "@" }];
    const g = await buildSampleWorkbook(base);
    const other = await buildSampleWorkbook([{ sheet: "L", addr: "A1", value: "X", numFmt: "General" }]);
    const { diffs } = await compareWorkbooks(g, other);
    expect(diffs).toHaveLength(1);
    // Sin aprobación → abierta (bloquea); con aprobación vigente → apartada.
    expect(applyApprovals(diffs, []).open).toHaveLength(1);
    const ok = applyApprovals(diffs, [{ hoja: "L", celda: "1:1", clase: "FORMATO", motivo: "fuente equivalente", aprobador: "contador", vigencia: "2099-01-01" }]);
    expect(ok.open).toHaveLength(0);
    expect(ok.approved).toHaveLength(1);
    expect(formatReport(diffs)).toContain("| L | 1:1 | FORMATO |");
  });

  it("2.A: el xlsx generado abre y convierte sin reparación (soffice)", async () => {
    const buf = await buildSampleWorkbook([{ sheet: "L", addr: "A1", value: "HOLA" }]);
    const dir = mkdtempSync(join(tmpdir(), "xlsx-"));
    const p = join(dir, "libro.xlsx");
    writeFileSync(p, buf);
    execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, p], { timeout: 60000 });
  }, 90000);

  it("2.A contra golden real: bitácora D1–D5 con decisiones vigentes", async () => {
    const base = [
      { sheet: "Libro", addr: "A1", value: "X" },
      { sheet: "Libro", addr: "B2", value: 100, numFmt: "#,##0.00" },
    ];
    const g = await buildSampleWorkbook(base);
    const actual = await buildSampleWorkbook([
      { sheet: "Libro", addr: "A1", value: "X" },
      { sheet: "Libro", addr: "B2", value: 101, numFmt: "#,##0.00" },
    ]);
    const { diffs } = await compareWorkbooks(g, actual);
    expect(diffs).toHaveLength(1);

    // Sin decisiones: VALOR abierto como D1 con magnitud.
    const rows = buildBitacora(diffs, []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "VALOR", clase: "D1", estado: "ABIERTA", magnitud: "1.00" });

    // D1 nunca es aprobable; la vigencia vencida no aparta (se valida al conciliar).
    const { decisions, errors } = parseDecisions([
      { hoja: "Libro", celda: "2:2", clase: "D1", motivo: "x", aprobador: "y", fecha: "2026-01-01", vigencia: "2099-01-01", resolucion: "APROBAR" },
      { hoja: "Libro", celda: "2:2", clase: "D4", motivo: "formato", aprobador: "contador", fecha: "2026-01-01", vigencia: "2020-01-01", resolucion: "APROBAR" },
    ]);
    expect(decisions).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(buildBitacora(diffs, decisions)[0]!.estado).toBe("ABIERTA");

    // Decisión D2 vigente aparta la fila.
    const ok = buildBitacora(diffs, [
      { hoja: "Libro", celda: "2:2", clase: "D2", motivo: "error legacy reconocido", aprobador: "contador", fecha: "2026-09-01", vigencia: "2099-01-01", resolucion: "APROBAR" },
    ]);
    expect(ok[0]).toMatchObject({ clase: "D2", estado: "APROBADA", aprobador: "contador" });
    expect(formatBitacora(ok)).toContain("| D2 (APROBADA) |");
    expect(bitacoraCsv(ok).split("\n")[0]).toContain("clase");
  });

  it("2.A contra golden real: inspect no expone valores (sin PII)", async () => {
    const buf = await buildSampleWorkbook([
      { sheet: "Libro", addr: "A1", value: "SECRETO-123" },
      { sheet: "Libro", addr: "B2", value: 999.99 },
    ]);
    const dir = mkdtempSync(join(tmpdir(), "golden-"));
    const p = join(dir, "candidato.xlsx");
    writeFileSync(p, buf);
    const inv = await inspectGolden(p);
    expect(inv.sheets).toHaveLength(1);
    expect(inv.sheets[0]).toMatchObject({ name: "Libro", rowCount: 2, columnCount: 2 });
    expect(inv.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(inv)).not.toContain("SECRETO-123");
    expect(JSON.stringify(inv)).not.toContain("999.99");
  });
});
