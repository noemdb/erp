"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Save from "@mui/icons-material/Save";
import { Button } from "@/components/ui/button";
import { HelpText, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { setSalesModeAction } from "@/modules/tenancy/settings-actions";

export function ModeForm({ companyId, mode }: { companyId: string; mode: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(mode === "z" ? "z" : "invoices");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await setSalesModeAction(companyId, value);
      if (!res.ok) {
        setMsg(`${res.error.code}: ${res.error.message}`);
      } else {
        toast({ title: "Modo actualizado", variant: "success" });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    "mt-1.5 h-9 w-full rounded-md border border-periwinkle-300 bg-white px-2.5 text-sm outline-none transition-colors focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:opacity-50";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="sales-mode">Fuente del Libro de Ventas</Label>
        <select
          id="sales-mode"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          className={selectCls}
        >
          <option value="invoices">Facturas individuales</option>
          <option value="z">Reportes Z</option>
        </select>
        <HelpText>G7: sin mezcla por período ni sucursal (control F8).</HelpText>
      </div>
      {msg && (
        <p role="status" className="text-sm text-red-700">
          {msg}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          <Save aria-hidden />
          {busy ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
