"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CheckCircle from "@mui/icons-material/CheckCircle";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { confirmImportAction } from "@/modules/imports/actions";

export function ConfirmButton({ companyId, batchId }: { companyId: string; batchId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            const res = await confirmImportAction(companyId, batchId);
            if (!res.ok) {
              setMsg(`${res.error.code}: ${res.error.message}`);
            } else {
              toast({
                title: "Importación confirmada",
                description: `${res.created} creados · ${res.skipped} omitidos · ${res.rejected} rechazados`,
                variant: "success",
              });
              setMsg(`Creados ${res.created}, omitidos ${res.skipped}, rechazados ${res.rejected}.`);
              router.refresh();
            }
          } catch {
            setMsg("Error de conexión. Intenta de nuevo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <>
            <Spinner label="Confirmando importación" />
            Confirmando…
          </>
        ) : (
          <>
            <CheckCircle aria-hidden />
            Confirmar (importar válidas)
          </>
        )}
      </Button>
      {msg && (
        <p role="status" className="mt-2 text-sm text-periwinkle-500">
          {msg}
        </p>
      )}
    </div>
  );
}
