"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Archive from "@mui/icons-material/Archive";
import { Button } from "@/components/ui/button";
import { saveSummaryVersionAction } from "@/modules/reporting/actions";

export function FreezeButton({
  companyId,
  periodId,
  canFreeze,
}: {
  companyId: string;
  periodId: string;
  canFreeze: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!canFreeze) {
    return (
      <p className="text-xs text-periwinkle-500">
        Solo el contador puede congelar versiones. Pide a un contador que
        congele el resumen cuando cuadre.
      </p>
    );
  }

  return (
    <div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          setIsError(false);
          try {
            const res = await saveSummaryVersionAction(companyId, periodId);
            if (!res.ok) {
              setIsError(true);
              setMsg(
                res.error.code === "FORBIDDEN"
                  ? "Solo el contador puede congelar versiones."
                  : `${res.error.code}: ${res.error.message}`,
              );
            } else {
              setMsg(
                `Versión ${res.version} congelada (${res.sha256.slice(0, 12)}…).`,
              );
              router.refresh();
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        <Archive aria-hidden />
        {busy ? "Congelando…" : "Congelar versión"}
      </Button>
      {msg && (
        <p
          role={isError ? "alert" : "status"}
          className={
            isError
              ? "mt-2.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              : "mt-2.5 rounded-md border border-icy-aqua-200 bg-icy-aqua-50 px-3 py-2 text-sm text-icy-aqua-800"
          }
        >
          {msg}
        </p>
      )}
    </div>
  );
}
