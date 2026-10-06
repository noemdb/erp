"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import { previewIvaAction, issueIvaAction } from "@/modules/withholdings/actions";

type Eligible = { id: string; docNumber: string; rif: string; ivaCausado: string; total: string };
type PreviewOk = Extract<Awaited<ReturnType<typeof previewIvaAction>>, { ok: true }>;

const inputClassName =
  "flex h-10 rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";

/** Códigos del motor → lenguaje del contador (sin jerga interna). */
function mensajeAmable(code: string, message: string): string {
  if (code === "NOT_APPLICABLE") {
    if (message.includes("EMPRESA_NO_AGENTE"))
      return "La empresa no es agente de retención IVA. Actívalo en Configuración para poder retener.";
    if (message.includes("TERCERO_NO_SUJETO"))
      return "El proveedor de esa factura no es sujeto de retención IVA.";
    if (message.includes("SIN_REGLA_VIGENTE"))
      return "No hay regla de retención vigente para esa fecha de emisión.";
    if (message.includes("SIN_IVA_CAUSADO"))
      return "Esa factura no tiene IVA causado que retener.";
    return "Esa factura no admite retención en estas condiciones.";
  }
  return `${code}: ${message}`;
}
/** "1234567.89" → "1.234.567,89" (solo presentación). */
function fmtMonto(s: string): string {
  const d = new Decimal(s || 0).toFixed(2);
  const [ent = "0", dec = "00"] = d.split(".");
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
}

export function EmitForm({ companyId, eligible }: { companyId: string; eligible: Eligible[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<PreviewOk | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [issueBusy, setIssueBusy] = useState(false);

  const busy = previewBusy || issueBusy;
  const all = eligible.length > 0 && sel.length === eligible.length;
  const ivaSel = sel.reduce((acc, id) => {
    const p = eligible.find((e) => e.id === id);
    return acc.plus(new Decimal(p?.ivaCausado || 0));
  }, new Decimal(0));

  function toggle(id: string, on: boolean) {
    setPreview(null);
    setSel(on ? [...sel, id] : sel.filter((x) => x !== id));
  }

  function toggleAll() {
    setPreview(null);
    setSel(all ? [] : eligible.map((e) => e.id));
  }

  async function doPreview() {
    setPreviewBusy(true);
    setMsg(null);
    try {
      const res = await previewIvaAction(companyId, sel, fecha);
      if (!res.ok) setMsg(mensajeAmable(res.error.code, res.error.message));
      else setPreview(res);
    } finally {
      setPreviewBusy(false);
    }
  }

  async function doIssue() {
    setIssueBusy(true);
    setMsg(null);
    try {
      const res = await issueIvaAction(companyId, sel, fecha);
      if (!res.ok) {
        setMsg(mensajeAmable(res.error.code, res.error.message));
        setIssueBusy(false);
      } else {
        router.push(`/c/${companyId}/retenciones/${res.id}`);
      }
    } catch {
      setMsg("Error de red al emitir. Intenta de nuevo.");
      setIssueBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Paso 1: facturas */}
      <Reveal>
        <Card className="overflow-hidden rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">
              1 · Elegir facturas
            </CardTitle>
            <CardDescription>
              Solo aparecen validadas, con IVA y aún no retenidas.{" "}
              {sel.length > 0
                ? `${sel.length} ${sel.length === 1 ? "elegida" : "elegidas"} · IVA ${fmtMonto(ivaSel.toString())}`
                : "Marca al menos una."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label htmlFor="fechaEmision" className="text-sm font-medium text-periwinkle-700">
                  Fecha de emisión
                </label>
                <input
                  id="fechaEmision"
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setPreview(null);
                  }}
                  disabled={busy}
                  className={inputClassName}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={toggleAll} disabled={busy}>
                {all ? "Quitar todas" : "Elegir todas"}
              </Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-periwinkle-200">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                    <th scope="col" className="w-10 px-4 py-3">
                      <span className="sr-only">Elegir</span>
                    </th>
                    <th scope="col" className="px-4 py-3">Factura</th>
                    <th scope="col" className="px-4 py-3">RIF</th>
                    <th scope="col" className="px-4 py-3 text-right">IVA</th>
                    <th scope="col" className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-periwinkle-100 transition-colors first:border-0 hover:bg-periwinkle-50/60"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Incluir factura ${p.docNumber}`}
                          checked={sel.includes(p.id)}
                          onChange={(e) => toggle(p.id, e.target.checked)}
                          disabled={busy}
                          className="h-4 w-4 accent-[#352574] disabled:opacity-50"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{p.docNumber}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">{p.rif}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                        {fmtMonto(p.ivaCausado)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                        {fmtMonto(p.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <Button onClick={doPreview} disabled={sel.length === 0 || busy} variant="secondary">
                {previewBusy ? (
                  <>
                    <Spinner label="Calculando retención" />
                    Calculando…
                  </>
                ) : (
                  "2 · Previsualizar cálculo"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Paso 2: previsualización con explicación (DOMAIN: el contador ve el porqué) */}
      {preview && (
        <Reveal>
          <Card className="overflow-hidden rounded-lg">
            <div className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]" aria-hidden />
            <CardHeader className="pb-3">
              <CardTitle className="text-base tracking-tight">
                2 · Cálculo a emitir
              </CardTitle>
              <CardDescription>
                Regla {preview.ruleVersionId ? preview.ruleVersionId.slice(0, 8) : "—"} ·{" "}
                {preview.lines.length} {preview.lines.length === 1 ? "factura" : "facturas"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-2xl font-bold tracking-tight tabular-nums">
                {fmtMonto(preview.total)}{" "}
                <span className="font-sans text-sm font-normal text-periwinkle-500">
                  total a retener
                </span>
              </p>
              <ul className="divide-y divide-periwinkle-100 rounded-md border border-periwinkle-200">
                {preview.lines.map((l) => (
                  <li key={l.purchaseDocumentId} className="space-y-1.5 px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">Factura {l.invoiceNumber}</span>
                      <span className="font-mono tabular-nums">
                        base {fmtMonto(l.taxableBase)} · IVA {fmtMonto(l.vatAmount)} ·{" "}
                        <strong>retenido {fmtMonto(l.retainedAmount)}</strong>
                      </span>
                    </div>
                    {l.explanation.length > 0 && (
                      <ul className="space-y-0.5 text-xs text-periwinkle-500">
                        {l.explanation.map((step, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <InfoOutlined className="mt-0.5 h-3.5 w-3.5 shrink-0 text-icy-aqua-700" aria-hidden />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <div>
                <Button onClick={doIssue} disabled={issueBusy}>
                  {issueBusy ? (
                    <>
                      <Spinner label="Emitiendo comprobante" />
                      Emitiendo…
                    </>
                  ) : (
                    "3 · Emitir comprobante"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {msg && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {msg}
        </p>
      )}
    </div>
  );
}
