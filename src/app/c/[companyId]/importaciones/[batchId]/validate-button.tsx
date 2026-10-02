"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FactCheck from "@mui/icons-material/FactCheck";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { validateBatchAction } from "@/modules/imports/actions";

export function ValidateButton({ companyId, batchId }: { companyId: string; batchId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await validateBatchAction(companyId, batchId);
            if (!res.ok) {
              setError(`${res.error.code}: ${res.error.message}`);
            } else {
              toast({
                title: "Lote validado",
                description: `${res.valid} válidas · ${res.warning} advertencias · ${res.rejected} rechazadas`,
                variant: "success",
              });
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
          <>
            <Spinner label="Validando lote" />
            Validando…
          </>
        ) : (
          <>
            <FactCheck aria-hidden />
            Validar filas
          </>
        )}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
