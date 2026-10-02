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
import { createSettlementEventAction } from "@/modules/payments/actions";

const errorEs: Record<string, string> = {
  FORBIDDEN: "Sin permiso para registrar eventos.",
  VALIDATION_ERROR: "Revisa los campos marcados.",
  NOT_FOUND: "Ese RIF no existe como tercero: créalo primero en Terceros.",
  G2_EVENT_REVIEW_REQUIRED: "Hay una retención ISLR emitida en fecha igual o posterior: anúlala y revisa antes de registrar este evento retroactivo.",
  DUPLICATE_DOCUMENT: "Evento duplicado.",
};

type Party = { rif: string; razonSocial: string; status: string };

/** Catálogo provisional de métodos (G11 pendiente de confirmación en checklist-F0). */
const METHODS = [
  { value: "", label: "Sin especificar" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "pago movil", label: "Pago móvil" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta", label: "Tarjeta (punto de venta)" },
  { value: "deposito", label: "Depósito bancario" },
  { value: "otro", label: "Otro (especificar)" },
] as const;

const inputCls =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";
const labelCls = "text-sm font-medium text-periwinkle-700";
const helpCls = "text-xs text-periwinkle-400";

export function PaymentForm({
  companyId,
  parties,
  criterion,
}: {
  companyId: string;
  parties: Party[];
  criterion: string;
}) {
  const router = useRouter();
  const [eventType, setEventType] = useState<"payment" | "account_credit">("payment");
  const [partyRif, setPartyRif] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [methodOther, setMethodOther] = useState("");
  const [inferred, setInferred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAbono = eventType === "account_credit";
  const amountOk = useMemo(() => {
    const n = Number(amount);
    return amount.trim() !== "" && Number.isFinite(n) && n > 0 && /^\d+(\.\d{1,2})?$/.test(amount.trim());
  }, [amount]);
  const partyKnown = useMemo(() => {
    const q = partyRif.trim().toLowerCase().replace(/[\s-]/g, "");
    if (!q) return false;
    return parties.some((p) => p.rif.toLowerCase().replace(/[\s-]/g, "") === q && p.status === "active");
  }, [partyRif, parties]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!amountOk) {
      setError("VALIDATION_ERROR: el monto debe ser mayor a 0, con punto decimal y hasta 2 decimales.");
      return;
    }
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "");
    const resolvedMethod =
      !isAbono && method
        ? method === "otro"
          ? methodOther.trim().slice(0, 50) || undefined
          : method
        : undefined;
    if (method === "otro" && !isAbono && !resolvedMethod) {
      setError("VALIDATION_ERROR: especifica el otro método de pago (máx. 50 caracteres).");
      return;
    }
    const res = await createSettlementEventAction(companyId, {
      partyRif,
      eventType,
      eventDate: v("eventDate"),
      amount: amount.trim(),
      method: resolvedMethod,
      sourceRef: v("sourceRef") || undefined,
      inferred,
    });
    if (!res.ok) {
      const code = (res.error as { code: string }).code;
      const msg = (res.error as { message: string }).message;
      setError(`${code}: ${errorEs[code] ?? msg}`);
      setBusy(false);
    } else {
      router.push(`/c/${companyId}/pagos/${(res as { id: string }).id}`);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4">
        <Card className="rounded-lg">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
            <div className="space-y-1.5">
              <CardTitle className="text-base tracking-tight">Beneficiario</CardTitle>
              <CardDescription>
                Debe existir como tercero activo; si no, créalo primero en Terceros.
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
              <label htmlFor="partyRif" className={labelCls}>RIF beneficiario</label>
              <input
                id="partyRif"
                value={partyRif}
                onChange={(e) => setPartyRif(e.target.value)}
                required
                maxLength={20}
                placeholder="J-12345678-9"
                autoComplete="off"
                className={inputCls}
                aria-describedby="partyRif-help"
              />
              <p id="partyRif-help" className={helpCls}>
                {partyRif.trim() === ""
                  ? "Proveedor o beneficiario del pago."
                  : partyKnown
                    ? "Tercero encontrado y activo."
                    : "Este RIF no está registrado: el servidor lo rechazará hasta crearlo."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Evento</CardTitle>
            <CardDescription>
              Pago o abono en cuenta, lo que ocurra primero dispara la retención.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="eventType" className={labelCls}>Tipo de evento</label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as "payment" | "account_credit")}
                className={inputCls}
              >
                <option value="payment">Pago</option>
                <option value="account_credit">Abono en cuenta</option>
              </select>
              <p className={helpCls}>
                {isAbono
                  ? "Acreditación contable del pagador; requiere asiento y referencia verificables."
                  : "Salida efectiva de fondos; lleva método de pago."}
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="eventDate" className={labelCls}>Fecha del evento</label>
              <input id="eventDate" name="eventDate" type="date" required className={inputCls} aria-describedby="eventDate-help" />
              <p id="eventDate-help" className={helpCls}>
                Fecha efectiva del {isAbono ? "abono contable" : "pago"}. No se infiere desde facturas.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="amount" className={labelCls}>Monto</label>
              <input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="1000.00"
                inputMode="decimal"
                autoComplete="off"
                className={inputCls}
              />
              <p className={helpCls}>Mayor a 0, en VES (moneda funcional; FX bloqueado G4).</p>
            </div>
            {!isAbono && (
              <div className="space-y-1.5">
                <label htmlFor="method" className={labelCls}>Método de pago</label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => { setMethod(e.target.value); setMethodOther(""); }}
                  className={inputCls}
                >
                  {METHODS.map((m) => (
                    <option key={m.label} value={m.value}>{m.label}</option>
                  ))}
                </select>
                {method === "otro" && (
                  <input
                    id="methodOther"
                    value={methodOther}
                    onChange={(e) => setMethodOther(e.target.value)}
                    maxLength={50}
                    placeholder="Especifica el método…"
                    autoComplete="off"
                    aria-label="Especificar otro método de pago"
                    className={inputCls}
                  />
                )}
                <p className={helpCls}>Catálogo provisional (G11 por confirmar). Solo pagos; un abono no lleva método.</p>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="sourceRef" className={labelCls}>Referencia contable / de pago</label>
              <input id="sourceRef" name="sourceRef" maxLength={200} placeholder="N° asiento, transferencia…" autoComplete="off" className={inputCls} />
              <p className={helpCls}>Trazabilidad del disparador para la retención ISLR.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-periwinkle-200 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={inferred}
                  onChange={(e) => setInferred(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#352574]"
                />
                <span>
                  <span className="text-sm font-medium">Dato inferido</span>
                  <span className="block text-xs text-periwinkle-500">
                    Márcalo solo si el evento se deduce sin soporte directo; queda auditado como tal.
                  </span>
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Confirmar</CardTitle>
            <CardDescription>
              Registrar no emite retención; el siguiente paso es asignar el evento a sus compras.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={amountOk ? "success" : "warning"} className={cn("rounded-md")}>
                {amountOk ? "Monto válido" : "Monto inválido"}
              </Badge>
              <Badge variant={partyKnown ? "success" : "outline"} className={cn("rounded-md")}>
                {partyKnown ? "Beneficiario activo" : "Beneficiario por verificar"}
              </Badge>
              {isAbono && criterion === "unset" && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                  <WarningAmber className="h-3.5 w-3.5" aria-hidden />
                  Con G2 sin definir este abono no podrá emitirse hasta convergencia o criterio explícito.
                </span>
              )}
            </div>
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            <div>
              <Button type="submit" disabled={busy || !amountOk} size="lg">
                <SaveOutlined className="h-4 w-4" aria-hidden />
                {busy ? "Guardando…" : "Guardar evento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} label="Catálogo de beneficiarios" wide>
        <h2 className="text-base font-bold tracking-tight">Terceros registrados</h2>
        <p className="mt-1 text-sm text-periwinkle-500">
          El evento exige un tercero existente y activo. Elige uno para autocompletar el RIF.
        </p>
        <div className="mt-3">
          <label htmlFor="party-query" className={labelCls}>Buscar por RIF o razón</label>
          <input
            id="party-query"
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
              {parties
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
