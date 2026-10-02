"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDraftAction } from "@/modules/rules/actions";

export function DraftForm({ companyId, concepts }: { companyId: string; concepts: { id: string; codigo: string }[] }) {
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
        const concept = String(fd.get("conceptId") ?? "");
        const res = await createDraftAction(companyId, {
          ruleKind: String(fd.get("ruleKind")) as "iva" | "islr",
          conceptId: concept || null,
          effectiveFrom: String(fd.get("effectiveFrom") ?? ""),
          porcentaje: String(fd.get("porcentaje") ?? ""),
          sustraendo: String(fd.get("sustraendo") ?? "") || "0",
          baseFormulaKind: String(fd.get("baseFormulaKind") ?? ""),
          legalReference: String(fd.get("legalReference") ?? ""),
          changeReason: String(fd.get("changeReason") ?? ""),
        });
        if (!res.ok) {
          setError(`${res.error.code}: ${res.error.message}`);
          setBusy(false);
        } else router.push(`/c/${companyId}/reglas/${res.id}`);
      }}
    >
      <label>Tipo <select name="ruleKind" defaultValue="iva"><option value="iva">IVA</option><option value="islr">ISLR</option></select></label>
      <label>Concepto (solo ISLR) <select name="conceptId" defaultValue=""><option value="">—</option>{concepts.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}</select></label>
      <label>Vigente desde <input name="effectiveFrom" type="date" required /></label>
      <label>Porcentaje (fracción) <input name="porcentaje" required placeholder="0.75" /></label>
      <label>Sustraendo <input name="sustraendo" defaultValue="0" /></label>
      <label>Base <input name="baseFormulaKind" required placeholder="iva_causado" /></label>
      <label>Fuente normativa <input name="legalReference" required /></label>
      <label>Motivo del cambio <input name="changeReason" required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Crear borrador"}</button>
    </form>
  );
}
