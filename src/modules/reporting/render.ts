import { createHash } from "node:crypto";
import type { PurchaseBookRow } from "@/modules/fiscal-docs/service";
import type { IvaSummary } from "./summary";

/**
 * 1.0.3 §3.2: plantillas HTML versionadas, futura fuente del PDF (Chromium).
 * Deterministas: misma entrada → mismos bytes → mismo sha (sin timestamps).
 */
export const TEMPLATE_VERSIONS = {
  purchaseBook: "purchase-book/v1",
  ivaCertificate: "iva-certificate/v1",
} as const;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderPurchaseBookHtml(meta: { empresa: string; periodo: string }, rows: PurchaseBookRow[]): { html: string; sha256: string } {
  const trs = rows.map((r) =>
    `<tr><td>${esc(r.fechaFiscal)}</td><td>${esc(r.rif)}</td><td>${esc(r.razonSocial)}</td><td>${esc(r.docNumber)}</td><td>${esc(r.controlNumber)}</td><td>${esc(r.baseImponible)}</td><td>${esc(r.ivaCausado)}</td><td>${esc(r.total)}</td></tr>`,
  ).join("");
  const html = `<!DOCTYPE html><html lang="es-VE"><head><meta charset="utf-8"><title>Libro de Compras</title></head><body><h1>Libro de Compras</h1><p>${esc(meta.empresa)} · ${esc(meta.periodo)}</p><table><thead><tr><th>Fecha</th><th>RIF</th><th>Razón</th><th>Factura</th><th>Control</th><th>Base</th><th>IVA</th><th>Total</th></tr></thead><tbody>${trs}</tbody></table><p>Plantilla ${TEMPLATE_VERSIONS.purchaseBook}</p></body></html>`;
  return { html, sha256: createHash("sha256").update(html).digest("hex") };
}

export function renderIvaCertificateHtml(data: {
  certificateNumber: string; fechaEmision: string; agente: string; beneficiario: string;
  lines: { invoiceNumber: string; controlNumber: string; taxableBase: string; vatAmount: string; retainedAmount: string }[];
  total: string;
}): { html: string; sha256: string } {
  const trs = data.lines.map((l) =>
    `<tr><td>${esc(l.invoiceNumber)}</td><td>${esc(l.controlNumber)}</td><td>${esc(l.taxableBase)}</td><td>${esc(l.vatAmount)}</td><td>${esc(l.retainedAmount)}</td></tr>`,
  ).join("");
  const html = `<!DOCTYPE html><html lang="es-VE"><head><meta charset="utf-8"><title>Comprobante ${esc(data.certificateNumber)}</title></head><body><h1>Comprobante de retención IVA ${esc(data.certificateNumber)}</h1><p>Agente: ${esc(data.agente)} · Beneficiario: ${esc(data.beneficiario)} · Emisión: ${esc(data.fechaEmision)}</p><table><thead><tr><th>Factura</th><th>Control</th><th>Base</th><th>IVA</th><th>Retenido</th></tr></thead><tbody>${trs}</tbody></table><p>Total retenido: ${esc(data.total)}</p><p>Plantilla ${TEMPLATE_VERSIONS.ivaCertificate}</p></body></html>`;
  return { html, sha256: createHash("sha256").update(html).digest("hex") };
}

export function renderSummaryHtml(meta: { empresa: string; periodo: string }, s: IvaSummary): { html: string; sha256: string } {
  const rows: [string, string][] = [
    ["Compras gravadas", s.comprasGravadas], ["Crédito fiscal", s.creditoFiscal],
    ["Ventas gravadas", s.ventasGravadas], ["Débito fiscal", s.debitoFiscal],
    ["Ret. IVA emitidas", s.retIvaEmitidas], ["Cuota del período", s.cuotaPeriodo],
  ];
  const trs = rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html lang="es-VE"><head><meta charset="utf-8"><title>Resumen IVA</title></head><body><h1>Resumen IVA</h1><p>${esc(meta.empresa)} · ${esc(meta.periodo)}</p><table>${trs}</table></body></html>`;
  return { html, sha256: createHash("sha256").update(html).digest("hex") };
}
