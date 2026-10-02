"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm({ companyId }: { companyId: string }) {
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
        const res = await fetch(`/api/companies/${companyId}/imports/upload`, { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) {
          setError(`${json.error.code}: ${json.error.message}`);
          setBusy(false);
        } else router.push(`/c/${companyId}/importaciones/${json.data.batchId}`);
      }}
    >
      <label>Tipo <select name="kind" defaultValue="purchases"><option value="purchases">Compras</option><option value="sales">Ventas</option><option value="z_reports">Reportes Z</option></select></label>
      <label>Fuente <select name="sourceSystem" defaultValue="legacy_accounting"><option value="legacy_accounting">Legacy</option><option value="fiscal_machine">Máquina fiscal</option><option value="manual">Manual</option></select></label>
      <label>Archivo <input name="file" type="file" accept=".csv,.txt" required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Subiendo…" : "Subir"}</button>
    </form>
  );
}
