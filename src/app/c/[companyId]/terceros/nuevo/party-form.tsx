"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertPartyAction } from "@/modules/parties/actions";

export function PartyForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const res = await upsertPartyAction(companyId, {
          rif: String(fd.get("rif") ?? ""),
          razonSocial: String(fd.get("razonSocial") ?? ""),
          direccionFiscal: String(fd.get("direccionFiscal") ?? "") || undefined,
        });
        if (!res.ok) {
          setError(`${res.error.code}: ${res.error.message}`);
          setBusy(false);
        } else router.push(`/c/${companyId}/terceros/${res.id}`);
      }}
    >
      <label>RIF <input name="rif" required placeholder="J-12345678-9" /></label>
      <label>Razón social <input name="razonSocial" required maxLength={200} /></label>
      <label>Dirección fiscal <input name="direccionFiscal" maxLength={500} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
