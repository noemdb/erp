"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateBatchAction } from "@/modules/imports/actions";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";

export function ValidateButton({ companyId, batchId }: { companyId: string; batchId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await validateBatchAction(companyId, batchId);
            if (!res.ok) setError(`${res.error.code}: ${res.error.message}`);
            else {
              toast({ title: "Lote validado", variant: "success" });
              router.refresh();
            }
          } catch {
            setError("Error de conexión. Intenta de nuevo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Spinner label="Validando lote" />
            Validando…
          </span>
        ) : (
          "Validar"
        )}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
