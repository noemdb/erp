"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setTaxProfileAction } from "@/modules/parties/actions";

export function ProfileForm({ companyId, partyId }: { companyId: string; partyId: string }) {
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
        const res = await setTaxProfileAction(companyId, partyId, {
          tipoPersona: (String(fd.get("tipoPersona")) || "juridica") as "natural" | "juridica",
          residente: fd.get("residente") === "on",
          condicionIva: String(fd.get("condicionIva") ?? "") || undefined,
          sujetoRetencionIva: fd.get("sujetoRetencionIva") === "on",
          sujetoRetencionIslr: fd.get("sujetoRetencionIslr") === "on",
          effectiveFrom: String(fd.get("effectiveFrom") ?? ""),
        });
        if (!res.ok) {
          setError(`${res.error.code}: ${res.error.message}`);
          setBusy(false);
        } else router.refresh();
      }}
    >
      <label>Tipo <select name="tipoPersona" defaultValue="juridica"><option value="natural">Natural</option><option value="juridica">Jurídica</option></select></label>
      <label><input type="checkbox" name="residente" defaultChecked /> Residente</label>
      <label>Condición IVA <input name="condicionIva" placeholder="ordinario" /></label>
      <label><input type="checkbox" name="sujetoRetencionIva" /> Sujeto retención IVA</label>
      <label><input type="checkbox" name="sujetoRetencionIslr" /> Sujeto retención ISLR</label>
      <label>Vigente desde <input name="effectiveFrom" type="date" required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Nuevo perfil (cierra el anterior)"}</button>
    </form>
  );
}
