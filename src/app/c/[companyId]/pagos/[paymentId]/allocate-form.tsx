"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { allocateSettlementEventAction } from "@/modules/payments/actions";

export function AllocateForm({ companyId, eventId, purchases }: { companyId: string; eventId: string; purchases: { id: string; docNumber: string; total: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const res = await allocateSettlementEventAction(companyId, eventId, String(fd.get("purchaseDocumentId")), String(fd.get("amount")));
        if (!res.ok) setError(`${res.error.code}: ${res.error.message}`);
        else router.refresh();
      }}
    >
      <label>Compra <select name="purchaseDocumentId">{purchases.map((p) => <option key={p.id} value={p.id}>{p.docNumber} ({p.total})</option>)}</select></label>
      <label>Monto asignado <input name="amount" required pattern="^\d+(\.\d{1,2})?$" /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Asignar</button>
    </form>
  );
}
