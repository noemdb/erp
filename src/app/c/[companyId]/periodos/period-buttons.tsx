"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendToReviewAction, returnToOpenAction, closePeriodAction, reopenPeriodAction } from "@/modules/periods/actions";

export function PeriodButtons({ companyId, periodId, status }: { companyId: string; periodId: string; status: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(p: Promise<{ ok: boolean; error?: unknown }>) {
    setError(null);
    const r = await p;
    if (!r.ok) setError((r.error as { code: string; message: string }).code + ": " + (r.error as { message: string }).message);
    else router.refresh();
  }

  return (
    <div>
      {status === "open" && <button onClick={() => run(sendToReviewAction(companyId, periodId))}>Enviar a revisión</button>}
      {status === "under_review" && (
        <>
          <button onClick={() => run(closePeriodAction(companyId, periodId))}>Cerrar</button>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo devolución" />
          <button onClick={() => run(returnToOpenAction(companyId, periodId, reason))}>Devolver</button>
        </>
      )}
      {status === "closed" && (
        <>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo reapertura" />
          <button onClick={() => run(reopenPeriodAction(companyId, periodId, reason))}>Reabrir</button>
        </>
      )}
      {status === "reopened" && (
        <>
          <button onClick={() => run(sendToReviewAction(companyId, periodId))}>Enviar a revisión</button>
          <button onClick={() => run(closePeriodAction(companyId, periodId))}>Re-cerrar</button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
