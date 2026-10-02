"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSummaryVersionAction } from "@/modules/reporting/actions";

export function FreezeButton({ companyId, periodId }: { companyId: string; periodId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        onClick={async () => {
          const res = await saveSummaryVersionAction(companyId, periodId);
          if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
          else {
            setMsg(`Versión ${res.version} congelada (${res.sha256.slice(0, 12)}…).`);
            router.refresh();
          }
        }}
      >
        Congelar versión
      </button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
