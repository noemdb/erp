"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSettlementEventAction } from "@/modules/payments/actions";

export function PaymentForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const rawEventType = String(fd.get("eventType") ?? "");
        if (rawEventType !== "payment" && rawEventType !== "account_credit") {
          setError("Tipo de evento inválido.");
          setBusy(false);
          return;
        }
        const eventType = rawEventType;
        const res = await createSettlementEventAction(companyId, {
          partyRif: String(fd.get("partyRif") ?? ""),
          eventType,
          eventDate: String(fd.get("eventDate") ?? ""),
          amount: String(fd.get("amount") ?? ""),
          method: eventType === "payment" ? String(fd.get("method") ?? "") || undefined : undefined,
          sourceRef: String(fd.get("sourceRef") ?? "") || undefined,
          inferred: false,
        });
        if (!res.ok) {
          setError(`${res.error.code}: ${res.error.message}`);
          setBusy(false);
        } else router.push(`/c/${companyId}/pagos/${res.id}`);
      }}
    >
      <label>RIF beneficiario (existente) <input name="partyRif" required /></label>
      <label>Tipo de evento
        <select name="eventType" defaultValue="payment">
          <option value="payment">Pago</option>
          <option value="account_credit">Abono en cuenta</option>
        </select>
      </label>
      <label>Fecha del evento <input name="eventDate" type="date" required /></label>
      <label>Monto <input name="amount" required pattern="^\d+(\.\d{1,2})?$" /></label>
      <label>Método de pago (solo pagos) <input name="method" placeholder="transferencia" /></label>
      <label>Referencia contable/de pago <input name="sourceRef" maxLength={200} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar pago"}</button>
    </form>
  );
}
