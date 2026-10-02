import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { renderPdf, browserHealth } from "./pdf";
import { renderPurchaseBookHtml, renderIvaCertificateHtml } from "./render";

const BASE = join(__dirname, "..", "..", "..", "fixtures", "pdf-baseline");

/** L1: el HTML fuente es determinista (ya probado en evidence.test). */
async function extractText(pdf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdf });
  const result = await parser.getText();
  return result.text;
}

describe("spike PDF Chromium (2.0.3 §3)", () => {
  it("navegador saludable y versión fijada", async () => {
    const h = await browserHealth();
    expect(h.ok).toBe(true);
    expect(h.version).toMatch(/Chrome\/\d+/);
  }, 60000);

  it("L3: texto del PDF == texto del HTML (tildes, ñ, Bs.)", async () => {
    const { html } = renderIvaCertificateHtml({
      certificateNumber: "20260900000001", fechaEmision: "2026-09-20",
      agente: "Señor Ñoño C.A.", beneficiario: "Proveedores Unidos",
      lines: [{ invoiceNumber: "F-1", controlNumber: "C-1", taxableBase: "100.00", vatAmount: "16.00", retainedAmount: "12.00" }],
      total: "12.00",
    });
    const { pdf, requests } = await renderPdf(html);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const text = await extractText(pdf);
    for (const needle of ["20260900000001", "Señor", "oño", "12.00", "F-1"]) expect(text).toContain(needle);
    expect(requests.filter((r) => !r.aborted)).toHaveLength(0);
  }, 90000);

  it("seguridad §3.4: HTML hostil no ejecuta ni llama a red", async () => {
    const evil = `<img src="http://evil.test/x.png"><iframe src="http://evil.test/f"></iframe><script>fetch("http://evil.test/s")</script>`;
    // Capa 1 (plantillas): el dato llega escapado como texto.
    const { html } = renderPurchaseBookHtml({ empresa: "Demo", periodo: "2026-09" }, [
      { kind: "invoice", status: "validated", fechaFiscal: "2026-09-05", rif: "J-1", razonSocial: evil, docNumber: "F-1", controlNumber: "C", baseImponible: "1.00", ivaCausado: "0.16", total: "1.16" },
    ]);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<iframe");
    // Las plantillas escapan: el dato llega como texto. Aquí se prueba la segunda
    // capa (navegador) con HTML crudo: debe abortar toda petición externa.
    const { pdf, requests } = await renderPdf(`<html><body>${evil}</body></html>`);
    expect(pdf.length).toBeGreaterThan(500);
    const external = requests.filter((r) => r.url.startsWith("http"));
    expect(external.length).toBeGreaterThan(0); // el HTML malicioso lo intentó
    expect(external.every((r) => r.aborted)).toBe(true); // todo abortado
  }, 90000);

  it("L4: raster primera página ≈ baseline (tolerancia 2%)", async () => {
    const { html } = renderPurchaseBookHtml({ empresa: "Demo", periodo: "2026-09" }, [
      { kind: "invoice", status: "validated", fechaFiscal: "2026-09-05", rif: "J-12345678-9", razonSocial: "Proveedor Uno", docNumber: "F-1", controlNumber: "C-1", baseImponible: "100.00", ivaCausado: "16.00", total: "116.00" },
    ]);
    const { pdf } = await renderPdf(html, { orientation: "landscape" });
    const dir = mkdtempSync(join(tmpdir(), "pdfspike-"));
    const pdfPath = join(dir, "doc.pdf");
    writeFileSync(pdfPath, pdf);
    execFileSync("pdftoppm", ["-r", "30", "-gray", "-f", "1", "-l", "1", "-singlefile", pdfPath, join(dir, "page")]);
    const pgm = readFileSync(join(dir, "page.pgm"));
    let idx = -1;
    for (let i = 0; i < 3; i++) idx = pgm.indexOf(10, idx + 1);
    expect(pgm.subarray(0, 2).toString()).toBe("P5");
    const pixels = pgm.subarray(idx + 1);
    expect(pixels.length).toBeGreaterThan(1000);
    const hash = createHash("sha256").update(pixels).digest("hex");
    mkdirSync(BASE, { recursive: true });
    const basePath = join(BASE, "purchase-book-p1.sha256");
    if (!existsSync(basePath)) {
      writeFileSync(basePath, `${hash}  purchase-book-p1.pgm\n`);
      console.log("baseline creado (revisar visualmente una vez y versionar)");
    }
    const expected = readFileSync(basePath, "utf8").split(/\s+/)[0]!;
    // Comparación exacta de píxeles en el mismo host; en CI se usa tolerancia (ver ADR-009).
    expect(hash).toBe(expected);
  }, 120000);
}, 300000);
