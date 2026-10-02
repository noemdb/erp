"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renderIvaPdfAction } from "@/modules/withholdings/actions";

export function RenderButton({ companyId, id, renderStatus }: { companyId: string; id: string; renderStatus: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (renderStatus === "done") return <p>PDF guardado (descárgalo desde Archivos).</p>;
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const res = await renderIvaPdfAction(companyId, id);
          if (!res.ok) {
            setMsg(`${res.error.code}: ${res.error.message}`);
            setBusy(false);
          } else router.refresh();
        }}
      >
        {busy ? "Renderizando…" : "Generar PDF"}
      </button>
      {msg && <p role="alert">{msg}</p>}
    </div>
  );
}
