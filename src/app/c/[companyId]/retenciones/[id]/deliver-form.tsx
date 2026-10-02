"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deliverIvaAction } from "@/modules/withholdings/actions";

export function DeliverForm({ companyId, id }: { companyId: string; id: string }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await deliverIvaAction(companyId, id, fecha);
        if (!res.ok) setError(`${res.error.code}: ${res.error.message}`);
        else router.refresh();
      }}
    >
      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      <button type="submit">Marcar entregado</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
