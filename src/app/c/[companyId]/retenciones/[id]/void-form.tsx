"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidIvaAction } from "@/modules/withholdings/actions";

export function VoidForm({ companyId, id }: { companyId: string; id: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await voidIvaAction(companyId, id, reason);
        if (!res.ok) setError(`${res.error.code}: ${res.error.message}`);
        else router.refresh();
      }}
    >
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo anulación" />
      <button type="submit">Anular (no libera número)</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
