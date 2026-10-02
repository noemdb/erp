"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { configureAbonoCriterionAction } from "@/modules/withholdings/actions";
import type { AbonoCriterion } from "@/modules/withholdings/g2-criterion";

const labels: Record<AbonoCriterion, string> = {
  unset: "Sin configurar (fail-closed)",
  payment_only: "Solo pago",
  account_credit_or_payment: "Abono en cuenta o pago (primero que ocurra)",
};

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

  const reasonOk = reason.trim().length >= 10;
  const changed = value !== criterion;

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
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <p className="text-sm text-periwinkle-700">
          Actual: <Badge variant="outline">{labels[criterion]}</Badge>
        </p>
        <label htmlFor="abonoCriterion" className={labelCls}>Criterio</label>
        <select
          id="abonoCriterion"
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "unset" || next === "payment_only" || next === "account_credit_or_payment")
              setValue(next);
          }}
          className={inputCls}
        >
          <option value="unset">{labels.unset}</option>
          <option value="payment_only">{labels.payment_only}</option>
          <option value="account_credit_or_payment">{labels.account_credit_or_payment}</option>
        </select>
        <p className={helpCls}>
          Cambiarlo registra actor, motivo y valores anterior/nuevo en la bitácora.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="criterionReason" className={labelCls}>Motivo/evidencia de la decisión</label>
        <input
          id="criterionReason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          placeholder="Mínimo 10 caracteres…"
          autoComplete="off"
          className={inputCls}
          aria-describedby="criterionReason-help"
        />
        <p id="criterionReason-help" className={helpCls}>
          Obligatorio (mín. 10). La previsualización dual bloquea divergencias mientras siga sin configurar.
        </p>
      </div>
      {message && (
        <p
          role={isError ? "alert" : "status"}
          className={
            isError
              ? "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 sm:col-span-2"
              : "rounded-md border border-icy-aqua-200 bg-icy-aqua-50 px-3 py-2 text-sm text-icy-aqua-800 sm:col-span-2"
          }
        >
          {isError && <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          {message}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="button" onClick={save} disabled={busy || !reasonOk || !changed}>
          {busy ? "Guardando…" : "Guardar criterio"}
        </Button>
      </div>
    </div>
  );
}
