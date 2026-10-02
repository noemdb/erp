"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { conciliateReceivedAction, applyReceivedAction, voidReceivedAction } from "@/modules/received/actions";

export function FlowButtons({ companyId, id, status, periods }: { companyId: string; id: string; status: string; periods: { id: string; range: string; status: string }[] }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [periodId, setPeriodId] = useState(periods.find((p) => p.status === "open")?.id ?? periods[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  async function run(p: Promise<{ ok: boolean; error?: unknown }>) {
    setMsg(null);
    const r = await p;
    if (!r.ok) setMsg(`${(r.error as { code: string }).code}: ${(r.error as { message: string }).message}`);
    else router.refresh();
  }

  return (
    <div>
      {status === "registrada" && (
        <>
          <button onClick={() => run(conciliateReceivedAction(companyId, id, false))}>Conciliar</button>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (si acepta exceso)" />
          <button onClick={() => run(conciliateReceivedAction(companyId, id, true, reason))}>Conciliar aceptando exceso</button>
        </>
      )}
      {status === "conciliada" && (
        <>
          <label>Período <select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>{periods.map((p) => <option key={p.id} value={p.id}>{p.range} ({p.status})</option>)}</select></label>
          <button onClick={() => run(applyReceivedAction(companyId, id, periodId))}>Aplicar a período</button>
        </>
      )}
      {status !== "anulada" && (
        <>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo anulación" />
          <button onClick={() => run(voidReceivedAction(companyId, id, reason))}>Anular</button>
        </>
      )}
      {msg && <p role="alert">{msg}</p>}
    </div>
  );
}
