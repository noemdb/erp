import { describe, expect, it } from "vitest";
import { renderIvaCertificateHtml, renderIslrCertificateHtml, BORRADOR_BANNER, TEMPLATE_VERSIONS } from "./render";

const ivaBase = {
  certificateNumber: "20260900000001", fechaEmision: "2026-09-20", agente: "A", beneficiario: "B",
  lines: [{ invoiceNumber: "F-1", controlNumber: "C-1", taxableBase: "100.00", vatAmount: "16.00", retainedAmount: "12.00" }],
  total: "12.00",
};

const islrBase = {
  certificateNumber: "ISLR-202609-000001", fechaEmision: "2026-09-20", fechaRetencion: "2026-09-10",
  beneficiario: "B", concepto: "HON", baseSujeta: "1000.00",
  porcentaje: "0.02", sustraendo: "0.00", retainedAmount: "20.00",
};

describe("marca BORRADOR en comprobantes (puro, B31)", () => {
  it("ausente por defecto y con borrador:false (compatibilidad)", () => {
    expect(renderIvaCertificateHtml(ivaBase).html).not.toContain(BORRADOR_BANNER);
    expect(renderIvaCertificateHtml({ ...ivaBase, borrador: false }).html).not.toContain(BORRADOR_BANNER);
    expect(renderIslrCertificateHtml(islrBase).html).not.toContain(BORRADOR_BANNER);
  });

  it("banner presente con borrador:true y cambia el sha", () => {
    const a = renderIvaCertificateHtml(ivaBase);
    const b = renderIvaCertificateHtml({ ...ivaBase, borrador: true });
    expect(b.html).toContain(BORRADOR_BANNER);
    expect(b.sha256).not.toBe(a.sha256);
    const c = renderIslrCertificateHtml(islrBase);
    const d = renderIslrCertificateHtml({ ...islrBase, borrador: true });
    expect(d.html).toContain(BORRADOR_BANNER);
    expect(d.sha256).not.toBe(c.sha256);
  });

  it("determinista por variante y plantillas v2", () => {
    expect(renderIvaCertificateHtml({ ...ivaBase, borrador: true }).sha256)
      .toBe(renderIvaCertificateHtml({ ...ivaBase, borrador: true }).sha256);
    expect(renderIvaCertificateHtml(ivaBase).html).toContain(TEMPLATE_VERSIONS.ivaCertificate);
    expect(renderIslrCertificateHtml(islrBase).html).toContain(TEMPLATE_VERSIONS.islrCertificate);
  });
});
