"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ManageSearch from "@mui/icons-material/ManageSearch";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";
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
import { createSaleAction } from "@/modules/sales/actions";

const KINDS = [
  { value: "invoice", label: "Factura", help: "Venta gravada al cliente." },
  { value: "credit_note", label: "Nota de crédito", help: "Disminuye una venta previa; requiere documento afectado y no puede exceder su saldo." },
  { value: "debit_note", label: "Nota de débito", help: "Incrementa una venta previa; requiere documento afectado." },
  { value: "export", label: "Exportación", help: "Venta al exterior, alícuota 0 %." },
  { value: "third_party", label: "Cuenta de terceros", help: "La empresa actúa como intermediaria, no como vendedora real." },
] as const;

const errorEs: Record<string, string> = {
  FORBIDDEN: "Sin permiso para registrar ventas.",
  VALIDATION_ERROR: "Revisa los campos marcados.",
  TOTAL_MISMATCH: "Base + IVA debe igualar el total.",
  MISSING_AFFECTED_DOCUMENT: "La NC/ND requiere documento afectado.",
  CREDIT_NOTE_EXCEEDS_BALANCE: "La nota de crédito excede el saldo disponible.",
  DUPLICATE_DOCUMENT: "Ya existe una venta con ese número y control para este cliente.",
  PERIOD_CLOSED: "El período de la fecha fiscal está cerrado.",
};

type DocOption = { id: string; kind: string; docNumber: string; total: string; rif: string; razonSocial: string };
type Client = { rif: string; razonSocial: string; status: string };

const inputCls =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";
const labelCls = "text-sm font-medium text-periwinkle-700";
const helpCls = "text-xs text-periwinkle-400";

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export function SaleForm({
  companyId,
  documents,
  clients,
  zMode,
}: {
  companyId: string;
  documents: DocOption[];
  clients: Client[];
  zMode: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<string>("invoice");
  const [partyRif, setPartyRif] = useState("");
  const [partyRazon, setPartyRazon] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [affectedId, setAffectedId] = useState("");
  const [base, setBase] = useState("");
  const [iva, setIva] = useState("");
  const [total, setTotal] = useState("");
  const [alicuota, setAlicuota] = useState("16");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsAffected = kind === "credit_note" || kind === "debit_note";
  const kindHelp = KINDS.find((k) => k.value === kind)?.help ?? "";

  const calc = useMemo(() => {
    const b = num(base);
    const iv = num(iva);
    const t = num(total);
    const a = num(alicuota);
    const valid = !Number.isNaN(b) && !Number.isNaN(iv) && !Number.isNaN(t);
    const diff = valid ? b + iv - t : NaN;
    const cuadran = valid && Math.abs(diff) <= 0.01;
    const esperado = !Number.isNaN(b) && !Number.isNaN(a) ? (b * a) / 100 : NaN;
    const alicuotaOk =
      kind === "export"
        ? iv === 0
        : Number.isNaN(esperado) || Number.isNaN(iv)
          ? true
          : Math.abs(esperado - iv) <= 0.01;
    return { diff, cuadran, valid, alicuotaOk };
  }, [base, iva, total, alicuota, kind]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (needsAffected && !affectedId) {
      setError("MISSING_AFFECTED_DOCUMENT: la NC/ND requiere documento afectado.");
      return;
    }
    if (!calc.cuadran) {
      setError(
        `TOTAL_MISMATCH: base + IVA debe igualar el total (dif ${Number.isNaN(calc.diff) ? "—" : Math.abs(calc.diff).toFixed(2)}).`,
      );
      return;
    }
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "");
    const res = await createSaleAction(companyId, {
      kind: kind as "invoice" | "credit_note" | "debit_note" | "export" | "third_party",
      partyRif,
      partyRazon,
      docNumber: v("docNumber"),
      controlNumber: v("controlNumber"),
      affectedDocumentId: needsAffected ? affectedId : undefined,
      fechaDocumento: v("fechaDocumento"),
      fechaFiscal: v("fechaFiscal"),
      baseImponible: base,
      ivaCausado: iva,
      total,
      alicuota: alicuota || (kind === "export" ? "0" : "16"),
    });
    if (!res.ok) {
      const code = res.error.code;
      setError(`${code}: ${errorEs[code] ?? res.error.message}`);
      setBusy(false);
    } else {
      router.push(`/c/${companyId}/ventas`);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4">
        {zMode && kind === "invoice" && (
          <p role="note" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Esta empresa lleva el Libro de Ventas por reportes Z: registrar
            facturas individuales puede mezclar modos en el mismo período. Si es
            una venta fuera de máquina fiscal, continúa; si no, cárgala como
            reporte Z.
          </p>
        )}

        <Card className="rounded-lg">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
            <div className="space-y-1.5">
              <CardTitle className="text-base tracking-tight">Cliente</CardTitle>
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
              <label htmlFor="partyRif" className={labelCls}>RIF cliente</label>
              <input id="partyRif" name="partyRif" value={partyRif} onChange={(e) => setPartyRif(e.target.value)} required maxLength={20} placeholder="J-12345678-9" autoComplete="off" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partyRazon" className={labelCls}>Razón social</label>
              <input id="partyRazon" name="partyRazon" value={partyRazon} onChange={(e) => setPartyRazon(e.target.value)} required maxLength={200} autoComplete="off" className={inputCls} />
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
              <select id="kind" value={kind} onChange={(e) => { setKind(e.target.value); setAffectedId(""); if (e.target.value === "export") { setAlicuota("0"); setIva("0.00"); } else if (alicuota === "0") setAlicuota("16"); }} className={inputCls}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
              <p className={helpCls}>{kindHelp}</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="docNumber" className={labelCls}>N° factura</label>
              <input id="docNumber" name="docNumber" required maxLength={50} autoComplete="off" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="controlNumber" className={labelCls}>N° control</label>
              <input id="controlNumber" name="controlNumber" required maxLength={50} autoComplete="off" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fechaDocumento" className={labelCls}>Fecha documento</label>
              <input id="fechaDocumento" name="fechaDocumento" type="date" required className={inputCls} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="fechaFiscal" className={labelCls}>Fecha fiscal</label>
              <input id="fechaFiscal" name="fechaFiscal" type="date" required aria-describedby="fechaFiscal-help" className={inputCls} />
              <p id="fechaFiscal-help" className={helpCls}>Determina el período fiscal de la venta.</p>
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
            <CardTitle className="text-base tracking-tight">Montos</CardTitle>
            <CardDescription>
              El servidor valida base + IVA = total (tolerancia 0,01) y guarda una línea general con la alícuota.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="base" className={labelCls}>Base imponible</label>
              <input id="base" value={base} onChange={(e) => setBase(e.target.value)} required placeholder="100.00" inputMode="decimal" autoComplete="off" pattern="^\d+(\.\d{1,2})?$" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="iva" className={labelCls}>IVA causado</label>
              <input id="iva" value={iva} onChange={(e) => setIva(e.target.value)} required placeholder="16.00" inputMode="decimal" autoComplete="off" pattern="^\d+(\.\d{1,2})?$" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="total" className={labelCls}>Total</label>
              <input id="total" value={total} onChange={(e) => setTotal(e.target.value)} required placeholder="116.00" inputMode="decimal" autoComplete="off" pattern="^\d+(\.\d{1,2})?$" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="alicuota" className={labelCls}>Alícuota %</label>
              <input id="alicuota" value={alicuota} onChange={(e) => setAlicuota(e.target.value)} placeholder="16" inputMode="decimal" autoComplete="off" className={inputCls} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <Badge variant={calc.cuadran ? "success" : "warning"} className={cn("rounded-md")}>
                {calc.cuadran ? "Cuadra Inv.1" : "No cuadra"}
              </Badge>
              {!calc.cuadran && calc.valid && !Number.isNaN(calc.diff) && (
                <span className="text-xs text-periwinkle-500">dif {Math.abs(calc.diff).toFixed(2)}</span>
              )}
              {calc.cuadran && !calc.alicuotaOk && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                  <WarningAmber className="h-3.5 w-3.5" aria-hidden />
                  El IVA no coincide con base × alícuota (referencial, no bloquea).
                </span>
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
                {busy ? "Guardando…" : "Guardar venta"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} label="Catálogo de clientes" wide>
        <h2 className="text-base font-bold tracking-tight">Clientes registrados</h2>
        <p className="mt-1 text-sm text-periwinkle-500">
          Elige uno para autocompletar RIF y razón social. Si no existe, ciérralo y escríbelos: se crea al guardar.
        </p>
        <div className="mt-3">
          <label htmlFor="client-query" className={labelCls}>Buscar por RIF o razón</label>
          <input
            id="client-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="J-… o nombre…"
            autoComplete="off"
            className={cn(inputCls, "mt-1.5")}
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
              {clients
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
