"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Settings from "@mui/icons-material/Settings";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { configureAbonoCriterionAction } from "@/modules/withholdings/actions";
import type { AbonoCriterion } from "@/modules/withholdings/g2-criterion";

const options: { value: AbonoCriterion; label: string; variant: "warning" | "outline" | "success"; detail: string }[] = [
  {
    value: "unset",
    label: "Sin configurar (fail-closed)",
    variant: "warning",
    detail: "Solo se emite ISLR sobre pagos asignados si ambos escenarios convergen. Abonos y divergencias se bloquean.",
  },
  {
    value: "payment_only",
    label: "Solo pago",
    variant: "outline",
    detail: "Solo eventos de pago asignados disparan retención. Los abonos en cuenta no generan comprobante.",
  },
  {
    value: "account_credit_or_payment",
    label: "Abono o pago, el primero",
    variant: "success",
    detail: "Pagos y abonos asignados disparan retención, lo que ocurra primero, con validación del disparador.",
  },
];

const inputCls =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";
const labelCls = "text-sm font-medium text-periwinkle-700";
const helpCls = "text-xs text-periwinkle-400";

export function AbonoCriterionForm({
  companyId,
  criterion,
}: {
  companyId: string;
  criterion: AbonoCriterion;
}) {
  const router = useRouter();
  const [value, setValue] = useState<AbonoCriterion>(criterion);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const current = options.find((o) => o.value === criterion) ?? options[0]!;
  const selected = options.find((o) => o.value === value) ?? options[0]!;
  const reasonLen = reason.trim().length;
  const reasonOk = reasonLen >= 10;
  const changed = value !== criterion;
  const canSave = reasonOk && changed && !busy;

  async function save() {
    setBusy(true);
    setMessage(null);
    setIsError(false);
    const result = await configureAbonoCriterionAction(companyId, { criterion: value, reason: reason.trim() });
    if (!result.ok) {
      const code = (result.error as { code: string }).code;
      const msg = (result.error as { message: string }).message;
      setMessage(`${code}: ${code === "FORBIDDEN" ? "Solo el contador puede configurar el criterio." : msg}`);
      setIsError(true);
      setBusy(false);
      return;
    }
    setMessage((result as { unchanged?: boolean }).unchanged ? "El criterio no cambió." : "Criterio guardado y auditado.");
    setReason("");
    setBusy(false);
    router.refresh();
  }

  return (
    <Card className="overflow-hidden rounded-lg">
      <div
        className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
        aria-hidden
      />
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base tracking-tight">
            <Settings className="h-4 w-4 text-periwinkle-500" aria-hidden />
            Criterio G2 por empresa
          </CardTitle>
          <CardDescription>
            Solo el contador lo cambia, con motivo auditado. Configurarlo no equivale a aprobación fiscal firmada.
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant={current.variant} className="shrink-0">{current.label}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-5">
        {/* Estado actual */}
        <div className="rounded-md border border-periwinkle-100 bg-periwinkle-50/60 px-4 py-3 lg:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
            Estado actual
          </p>
          <p className="mt-1 font-semibold">{current.label}</p>
          <p className="mt-1 text-sm text-periwinkle-500">{current.detail}</p>
          {changed && (
            <p className="mt-3 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
              <ArrowForward className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Cambio pendiente: {current.label} → {selected.label}
            </p>
          )}
        </div>

        {/* Cambiar */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1 xl:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="abonoCriterion" className={labelCls}>Cambiar a</label>
            <select
              id="abonoCriterion"
              value={value}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "unset" || next === "payment_only" || next === "account_credit_or_payment")
                  setValue(next);
              }}
              className={inputCls}
              aria-describedby="abonoCriterion-help"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p id="abonoCriterion-help" className={helpCls}>{selected.detail}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="criterionReason" className={labelCls}>Motivo/evidencia</label>
              <span className={cn("font-mono text-xs tabular-nums", reasonOk ? "text-icy-aqua-700" : "text-periwinkle-400")}>
                {reasonLen}/500 · mín. 10
              </span>
            </div>
            <input
              id="criterionReason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Ej.: acta de gerencia 2026-10 que adopta pago como disparador…"
              autoComplete="off"
              className={inputCls}
            />
            <p className={helpCls}>Obligatorio. Registra actor y valores anterior/nuevo en bitácora.</p>
          </div>
        </div>

        {message && (
          <p
            role={isError ? "alert" : "status"}
            className={
              isError
                ? "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 lg:col-span-5"
                : "rounded-md border border-icy-aqua-200 bg-icy-aqua-50 px-3 py-2 text-sm text-icy-aqua-800 lg:col-span-5"
            }
          >
            {isError && <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 lg:col-span-5">
          <Button type="button" onClick={save} disabled={!canSave}>
            {busy ? "Guardando…" : "Guardar criterio"}
          </Button>
          {!canSave && !busy && (
            <span className="text-xs text-periwinkle-500">
              {!changed
                ? "Sin cambios respecto al actual."
                : !reasonOk
                  ? `Faltan ${10 - reasonLen} caracteres de motivo.`
                  : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
