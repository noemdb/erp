"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";
import ManageSearch from "@mui/icons-material/ManageSearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createPurchaseAction } from "@/modules/fiscal-docs/actions";

const CATEGORIES = [
  { value: "general", label: "Gravada general" },
  { value: "reduced", label: "Gravada reducida" },
  { value: "additional", label: "Gravada + adicional" },
  { value: "exempt", label: "Exenta" },
  { value: "no_subject", label: "No sujeta" },
  { value: "no_credit", label: "Sin derecho a crédito" },
] as const;

const KINDS = [
  { value: "invoice", label: "Factura" },
  { value: "credit_note", label: "Nota de crédito" },
  { value: "debit_note", label: "Nota de débito" },
  { value: "import", label: "Importación" },
  { value: "exempt", label: "Compra exenta" },
] as const;

type TaxCategory = "general" | "reduced" | "additional" | "exempt" | "no_subject" | "no_credit";
type DocOption = { id: string; kind: string; docNumber: string; total: string; rif: string; razonSocial: string };
type Line = { taxCategory: TaxCategory; taxRate: string; base: string; iva: string; description: string };

const GRAVADAS = new Set(["general", "reduced", "additional"]);
const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const inputCls =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";
const labelCls = "text-sm font-medium text-periwinkle-700";
const helpCls = "text-xs text-periwinkle-400";

type Supplier = { rif: string; razonSocial: string; status: string };

export function PurchaseForm({ companyId, documents, suppliers }: { companyId: string; documents: DocOption[]; suppliers: Supplier[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<string>("invoice");
  const [partyRif, setPartyRif] = useState("");
  const [partyRazon, setPartyRazon] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [affectedId, setAffectedId] = useState("");
  const [total, setTotal] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { taxCategory: "general", taxRate: "0.16", base: "", iva: "", description: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsAffected = kind === "credit_note" || kind === "debit_note";

  const calc = useMemo(() => {
    let base = 0;
    let iva = 0;
    let exento = 0;
    let valid = true;
    for (const l of lines) {
      const b = num(l.base);
      const iv = num(l.iva);
      if (Number.isNaN(b) || Number.isNaN(iv)) {
        valid = false;
        continue;
      }
      if (GRAVADAS.has(l.taxCategory)) {
        base += b;
        iva += iv;
      } else {
        exento += b;
      }
    }
    const t = num(total);
    const diff = Number.isNaN(t) ? NaN : base + iva + exento - t;
    return { base, iva, exento, diff, valid, cuadran: valid && !Number.isNaN(diff) && Math.abs(diff) <= 0.01 };
  }, [lines, total]);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => {
      const next = [...prev];
      const merged = { ...next[i]!, ...patch };
      // Las líneas no gravadas no llevan IVA (invariante de dominio).
      if (!GRAVADAS.has(merged.taxCategory)) {
        merged.iva = "0.00";
        merged.taxRate = "";
      }
      next[i] = merged;
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (needsAffected && !affectedId) {
      setError("MISSING_AFFECTED_DOCUMENT: la NC/ND requiere documento afectado.");
      return;
    }
    if (!calc.cuadran) {
      setError(`TOTAL_MISMATCH: base + IVA + exento debe igualar el total (dif ${Number.isNaN(calc.diff) ? "—" : Math.abs(calc.diff).toFixed(2)}).`);
      return;
    }
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "");
    const res = await createPurchaseAction(companyId, {
      partyRif,
      partyRazon,
      kind: kind as "invoice" | "credit_note" | "debit_note" | "import" | "exempt",
      affectedDocumentId: needsAffected ? affectedId : undefined,
      docNumber: v("docNumber"),
      controlNumber: v("controlNumber"),
      fechaDocumento: v("fechaDocumento"),
      fechaRecepcion: v("fechaRecepcion") || undefined,
      fechaFiscal: v("fechaFiscal"),
      total,
      lines: lines.map((l) => ({
        taxCategory: l.taxCategory,
        taxRate: GRAVADAS.has(l.taxCategory) ? l.taxRate || null : null,
        base: l.base,
        iva: l.iva,
        description: l.description || undefined,
      })),
    });
    if (!res.ok) {
      setError(`${res.error.code}: ${res.error.message}`);
      setBusy(false);
    } else {
      router.push(`/c/${companyId}/compras`);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4">
        <Card className="rounded-lg">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
            <div className="space-y-1.5">
              <CardTitle className="text-base tracking-tight">Proveedor</CardTitle>
              <CardDescription>
                Si el RIF no existe, se crea el tercero con estos datos.
              </CardDescription>
            </div>
            <CardAction>
              <Button type="button" variant="outline" size="sm" onClick={() => { setQuery(""); setCatalogOpen(true); }} className="shrink-0">
                <ManageSearch className="h-4 w-4" aria-hidden />
                Buscar en registrados
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="partyRif" className={labelCls}>RIF proveedor</label>
              <Input name="partyRif" value={partyRif} onChange={(e) => setPartyRif(e.target.value)} required maxLength={20} placeholder="J-12345678-9" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partyRazon" className={labelCls}>Razón social</label>
              <Input name="partyRazon" value={partyRazon} onChange={(e) => setPartyRazon(e.target.value)} required maxLength={200} autoComplete="off" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Documento</CardTitle>
            <CardDescription>
              La fecha fiscal determina el período; la de registro nunca la sustituye.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="kind" className={labelCls}>Tipo</label>
              <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="docNumber" className={labelCls}>N° factura</label>
              <Input name="docNumber" required maxLength={50} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="controlNumber" className={labelCls}>N° control</label>
              <Input name="controlNumber" required maxLength={50} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fechaDocumento" className={labelCls}>Fecha documento</label>
              <Input name="fechaDocumento" type="date" required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fechaRecepcion" className={labelCls}>Fecha recepción</label>
              <Input name="fechaRecepcion" type="date" />
              <p className={helpCls}>Opcional; relevante para compras.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fechaFiscal" className={labelCls}>Fecha fiscal</label>
              <Input name="fechaFiscal" type="date" required aria-describedby="fechaFiscal-help" />
              <p id="fechaFiscal-help" className={helpCls}>Determina el período fiscal del documento.</p>
            </div>
            {needsAffected && (
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="affectedDocumentId" className={labelCls}>Documento afectado</label>
                <select
                  id="affectedDocumentId"
                  value={affectedId}
                  onChange={(e) => setAffectedId(e.target.value)}
                  required={needsAffected}
                  className={inputCls}
                >
                  <option value="">Selecciona el documento original…</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.docNumber} · {d.razonSocial} · {d.total}
                    </option>
                  ))}
                </select>
                <p className={helpCls}>Sin documento afectado la NC/ND es inválida; la NC no puede exceder su saldo.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Líneas y clasificación fiscal</CardTitle>
            <CardDescription>
              Separa gravadas, exentas y no sujetas. La retención de IVA solo aplica sobre el IVA causado gravado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {lines.map((l, i) => {
              const gravada = GRAVADAS.has(l.taxCategory);
              return (
                <fieldset
                  key={i}
                  className="grid gap-3 rounded-md border border-periwinkle-200 p-3 sm:grid-cols-6"
                >
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-periwinkle-500">
                    Línea {i + 1}
                  </legend>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor={`cat-${i}`} className={labelCls}>Tratamiento</label>
                    <select
                      id={`cat-${i}`}
                      value={l.taxCategory}
                      onChange={(e) => setLine(i, { taxCategory: e.target.value as TaxCategory })}
                      className={inputCls}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`rate-${i}`} className={labelCls}>Alícuota (fracción, ej. 0.16)</label>
                    <Input
                      id={`rate-${i}`}
                      value={l.taxRate}
                      onChange={(e) => setLine(i, { taxRate: e.target.value })}
                      disabled={!gravada}
                      placeholder={gravada ? "0.16" : "—"}
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`base-${i}`} className={labelCls}>Base</label>
                    <Input
                      id={`base-${i}`}
                      value={l.base}
                      onChange={(e) => setLine(i, { base: e.target.value })}
                      required
                      placeholder="100.00"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`iva-${i}`} className={labelCls}>IVA</label>
                    <Input
                      id={`iva-${i}`}
                      value={l.iva}
                      onChange={(e) => setLine(i, { iva: e.target.value })}
                      disabled={!gravada}
                      required
                      placeholder="16.00"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={lines.length <= 1}
                      onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`Quitar línea ${i + 1}`}
                    >
                      <Delete className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </fieldset>
              );
            })}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    { taxCategory: "general", taxRate: "0.16", base: "", iva: "", description: "" },
                  ])
                }
              >
                <Add className="h-4 w-4" aria-hidden />
                Agregar línea
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Totales</CardTitle>
            <CardDescription>
              Previsualización local; el servidor valida base + IVA + exento = total.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="total" className={labelCls}>Total documento</label>
              <Input
                id="total"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                required
                placeholder="116.00"
                inputMode="decimal"
                autoComplete="off"
                aria-describedby="total-help"
              />
              <p id="total-help" className={helpCls}>
                Base gravada {calc.base.toFixed(2)} + IVA {calc.iva.toFixed(2)} + exento {calc.exento.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={calc.cuadran ? "success" : "warning"} className={cn("rounded-md")}>
                {calc.cuadran ? "Cuadra Inv.1" : "No cuadra"}
              </Badge>
              {!calc.cuadran && calc.valid && !Number.isNaN(calc.diff) && (
                <span className="text-xs text-periwinkle-500">dif {Math.abs(calc.diff).toFixed(2)}</span>
              )}
            </div>
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 sm:col-span-2">
                <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy || !calc.cuadran} size="lg">
                <SaveOutlined className="h-4 w-4" aria-hidden />
                {busy ? "Guardando…" : "Guardar compra"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} label="Catálogo de proveedores" wide>
        <h2 className="text-base font-bold tracking-tight">Proveedores registrados</h2>
        <p className="mt-1 text-sm text-periwinkle-500">
          Elige uno para autocompletar RIF y razón social. Si no existe, ciérralo y escríbelos: se crea al guardar.
        </p>
        <div className="mt-3">
          <label htmlFor="supplier-query" className={labelCls}>Buscar por RIF o razón</label>
          <Input
            id="supplier-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="J-… o nombre…"
            autoComplete="off"
          />
        </div>
        <div className="mt-3 max-h-[50vh] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                <th scope="col" className="px-4 py-3">RIF</th>
                <th scope="col" className="px-4 py-3">Razón social</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Elegir</span></th>
              </tr>
            </thead>
            <tbody>
              {suppliers
                .filter((s) => {
                  const q = query.trim().toLowerCase();
                  return q === "" || s.rif.toLowerCase().includes(q) || s.razonSocial.toLowerCase().includes(q);
                })
                .map((s) => (
                  <tr key={s.rif} className="border-b border-periwinkle-100 last:border-0 hover:bg-periwinkle-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{s.rif}</td>
                    <td className="max-w-64 truncate px-4 py-3" title={s.razonSocial}>{s.razonSocial}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={s.status === "active" ? "success" : "muted"} className="rounded-md">
                        {s.status === "active" ? "Activo" : s.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={s.status !== "active"}
                        onClick={() => {
                          setPartyRif(s.rif);
                          setPartyRazon(s.razonSocial);
                          setCatalogOpen(false);
                        }}
                      >
                        Elegir
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </form>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}
