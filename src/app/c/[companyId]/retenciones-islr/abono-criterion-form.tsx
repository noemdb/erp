"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { configureAbonoCriterionAction } from "@/modules/withholdings/actions";
import type { AbonoCriterion } from "@/modules/withholdings/g2-criterion";

const labels: Record<AbonoCriterion, string> = {
  unset: "Sin configurar (fail-closed)",
  payment_only: "Solo pago",
  account_credit_or_payment: "Abono en cuenta o pago (primero que ocurra)",
};

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
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    const result = await configureAbonoCriterionAction(companyId, { criterion: value, reason });
    if (!result.ok) {
      setMessage(`${result.error.code}: ${result.error.message}`);
      setBusy(false);
      return;
    }
    setMessage(result.unchanged ? "El criterio no cambió." : "Criterio guardado y auditado.");
    setReason("");
    setBusy(false);
    router.refresh();
  }

  return (
    <section>
      <h2>Criterio G2 por empresa</h2>
      <p>
        Actual: {labels[criterion]}. Cambiarlo registra actor, motivo y valores anterior/nuevo en la bitácora.
      </p>
      <p role="note">
        Configurarlo no equivale a aprobación fiscal firmada. La previsualización dual bloquea los casos
        divergentes mientras el criterio permanezca sin configurar.
      </p>
      <label>
        Criterio
        <select
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "unset" || next === "payment_only" || next === "account_credit_or_payment")
              setValue(next);
          }}
        >
          <option value="unset">{labels.unset}</option>
          <option value="payment_only">{labels.payment_only}</option>
          <option value="account_credit_or_payment">{labels.account_credit_or_payment}</option>
        </select>
      </label>
      <label>
        Motivo/evidencia de la decisión (mínimo 10 caracteres)
        <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
      </label>
      <button type="button" onClick={save} disabled={busy || reason.trim().length < 10}>
        {busy ? "Guardando…" : "Guardar criterio"}
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
