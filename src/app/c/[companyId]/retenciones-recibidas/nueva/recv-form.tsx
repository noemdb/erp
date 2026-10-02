"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerReceivedAction } from "@/modules/received/actions";

type Buy = { id: string; docNumber: string; total: string };

export function RecvForm({ companyId, purchases }: { companyId: string; purchases: Buy[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const res = await registerReceivedAction(companyId, {
          agentRif: String(fd.get("agentRif") ?? ""),
          agentRazon: String(fd.get("agentRazon") ?? ""),
          certificateNumber: String(fd.get("certificateNumber") ?? ""),
          fechaComprobante: String(fd.get("fechaComprobante") ?? ""),
          fechaRecepcion: String(fd.get("fechaRecepcion") ?? ""),
          ivaCausado: String(fd.get("ivaCausado") ?? "") || "0.00",
          montoRetenido: String(fd.get("montoRetenido") ?? ""),
          purchaseDocumentIds: sel,
          notes: String(fd.get("notes") ?? "") || undefined,
        });
        if (!res.ok) {
          setError(`${res.error.code}: ${res.error.message}`);
          setBusy(false);
        } else router.push(`/c/${companyId}/retenciones-recibidas/${res.id}`);
      }}
    >
      <label>RIF agente retenedor <input name="agentRif" required /></label>
      <label>Razón agente <input name="agentRazon" required /></label>
      <label>N° comprobante <input name="certificateNumber" required /></label>
      <label>Fecha comprobante <input name="fechaComprobante" type="date" required /></label>
      <label>Fecha recepción <input name="fechaRecepcion" type="date" required /></label>
      <label>IVA causado <input name="ivaCausado" defaultValue="0.00" /></label>
      <label>Monto retenido <input name="montoRetenido" required pattern="^\d+(\.\d{1,2})?$" /></label>
      <label>Notas <input name="notes" /></label>
      <fieldset>
        <legend>Facturas vinculadas</legend>
        {purchases.map((p) => (
          <label key={p.id}><input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel(e.target.checked ? [...sel, p.id] : sel.filter((x) => x !== p.id))} /> {p.docNumber} ({p.total})</label>
        ))}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button>
    </form>
  );
}
