"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSaleAction } from "@/modules/sales/actions";

export function SaleForm({ companyId }: { companyId: string }) {
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
        const v = (k: string) => String(fd.get(k) ?? "");
        const kind = v("kind") as "invoice" | "credit_note" | "debit_note" | "export" | "third_party";
        const res = await createSaleAction(companyId, {
          kind,
          partyRif: v("partyRif"),
          partyRazon: v("partyRazon"),
          docNumber: v("docNumber"),
          controlNumber: v("controlNumber"),
          affectedDocumentId: v("affectedDocumentId") || undefined,
          fechaDocumento: v("fechaDocumento"),
          fechaFiscal: v("fechaFiscal"),
          baseImponible: v("baseImponible"),
          ivaCausado: v("ivaCausado"),
          total: v("total"),
          alicuota: v("alicuota") || "16",
        });
        if (!res.ok) {
          setError(`${res.error.code}: ${res.error.message}`);
          setBusy(false);
        } else router.push(`/c/${companyId}/ventas`);
      }}
    >
      <label>Tipo <select name="kind" defaultValue="invoice"><option value="invoice">Factura</option><option value="credit_note">Nota de crédito</option><option value="debit_note">Nota de débito</option><option value="export">Exportación</option><option value="third_party">Cuenta de terceros</option></select></label>
      <label>RIF cliente <input name="partyRif" required /></label>
      <label>Razón social <input name="partyRazon" required /></label>
      <label>N° factura <input name="docNumber" required /></label>
      <label>N° control <input name="controlNumber" required /></label>
      <label>Afecta a (ID, solo NC/ND) <input name="affectedDocumentId" placeholder="uuid" /></label>
      <label>Fecha documento <input name="fechaDocumento" type="date" required /></label>
      <label>Fecha fiscal <input name="fechaFiscal" type="date" required /></label>
      <label>Base <input name="baseImponible" required pattern="^\d+(\.\d{1,2})?$" /></label>
      <label>IVA <input name="ivaCausado" required pattern="^\d+(\.\d{1,2})?$" /></label>
      <label>Total <input name="total" required pattern="^\d+(\.\d{1,2})?$" /></label>
      <label>Alícuota % <input name="alicuota" defaultValue="16" /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar venta"}</button>
    </form>
  );
}
