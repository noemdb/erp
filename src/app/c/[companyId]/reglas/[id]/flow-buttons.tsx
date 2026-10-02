"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CheckCircle from "@mui/icons-material/CheckCircle";
import RateReview from "@mui/icons-material/RateReview";
import ThumbUp from "@mui/icons-material/ThumbUp";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { submitRuleAction, approveRuleAction, activateRuleAction } from "@/modules/rules/actions";

const NEXT: Record<string, { label: string; icon: typeof RateReview; run: (c: string, id: string) => Promise<{ ok: boolean; error?: unknown }> }> = {
  draft: { label: "Enviar a revisión", icon: RateReview, run: submitRuleAction },
  in_review: { label: "Aprobar", icon: ThumbUp, run: approveRuleAction },
  approved: { label: "Activar (cierra vigencia anterior)", icon: CheckCircle, run: activateRuleAction },
};

export function RuleFlowButtons({ companyId, id, status }: { companyId: string; id: string; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = NEXT[status];
  if (!next) return null;
  const { label, run: runStep, icon: Icon } = next;

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await runStep(companyId, id);
      if (!r.ok) {
        const e = r.error as { code?: string; message?: string };
        setMsg(`${e.code ?? ""}: ${e.message ?? "No se pudo avanzar."}`);
      } else {
        toast({ title: label, variant: "success" });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button disabled={busy} onClick={run}>
        {busy ? (
          <>
            <Spinner label="Avanzando regla" />
            Procesando…
          </>
        ) : (
          <>
            <Icon aria-hidden />
            {label}
          </>
        )}
      </Button>
      {msg && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {msg}
        </p>
      )}
    </div>
  );
}
