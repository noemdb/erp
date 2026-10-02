"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitRuleAction, approveRuleAction, activateRuleAction } from "@/modules/rules/actions";

export function RuleFlowButtons({ companyId, id, status }: { companyId: string; id: string; status: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function run(p: Promise<{ ok: boolean; error?: unknown }>) {
    setMsg(null);
    const r = await p;
    if (!r.ok) setMsg(`${(r.error as { code: string }).code}: ${(r.error as { message: string }).message}`);
    else router.refresh();
  }

  return (
    <div>
      {status === "draft" && <button onClick={() => run(submitRuleAction(companyId, id))}>Enviar a revisión</button>}
      {status === "in_review" && <button onClick={() => run(approveRuleAction(companyId, id))}>Aprobar</button>}
      {status === "approved" && <button onClick={() => run(activateRuleAction(companyId, id))}>Activar (cierra vigencia anterior)</button>}
      {msg && <p role="alert">{msg}</p>}
    </div>
  );
}
