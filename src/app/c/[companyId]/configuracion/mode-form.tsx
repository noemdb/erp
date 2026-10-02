"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSalesModeAction } from "@/modules/tenancy/settings-actions";

export function ModeForm({ companyId, mode }: { companyId: string; mode: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await setSalesModeAction(companyId, String(new FormData(e.currentTarget).get("mode")));
        if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
        else {
          setMsg("Modo actualizado (auditado).");
          router.refresh();
        }
      }}
    >
      <label>Modo <select name="mode" defaultValue={mode}><option value="invoices">Facturas individuales</option><option value="z">Reportes Z</option></select></label>
      <button type="submit">Guardar</button>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}
