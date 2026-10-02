"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertObligationAction, addHolidayAction } from "@/modules/deadlines/actions";

export function ObligationForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const res = await upsertObligationAction(companyId, {
          kind: String(fd.get("kind")),
          fuenteNormativa: String(fd.get("fuente") ?? ""),
          articulo: String(fd.get("articulo") ?? ""),
          effectiveFrom: String(fd.get("effectiveFrom") ?? ""),
          diasHabiles: Number(fd.get("dias")),
        });
        if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
        else router.refresh();
      }}
    >
      <label>Tipo <select name="kind" defaultValue="iva_entrega"><option value="iva_entrega">Entrega IVA</option><option value="islr_entrega">Entrega ISLR</option></select></label>
      <label>Fuente <input name="fuente" required placeholder="Providencia SNAT/2025/000054" /></label>
      <label>Artículo <input name="articulo" required placeholder="16" /></label>
      <label>Vigente desde <input name="effectiveFrom" type="date" required /></label>
      <label>Días hábiles <input name="dias" type="number" min={1} max={30} defaultValue={2} required /></label>
      <button type="submit">Guardar obligación</button>
      {msg && <p role="alert">{msg}</p>}
    </form>
  );
}

export function HolidayForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const res = await addHolidayAction(companyId, String(fd.get("fecha") ?? ""), String(fd.get("descripcion") ?? "") || undefined);
        if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
        else router.refresh();
      }}
    >
      <label>Fecha <input name="fecha" type="date" required /></label>
      <label>Descripción <input name="descripcion" /></label>
      <button type="submit">Agregar feriado</button>
      {msg && <p role="alert">{msg}</p>}
    </form>
  );
}
