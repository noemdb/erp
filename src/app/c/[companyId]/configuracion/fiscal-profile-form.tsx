"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Save from "@mui/icons-material/Save";
import { Button } from "@/components/ui/button";
import { HelpText, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateFiscalProfileAction } from "@/modules/tenancy/settings-actions";

export type FiscalProfileInitial = {
  condicionIva: string;
  contribuyenteEspecialDesde: string | null;
  agenteRetencionIva: boolean;
  agenteRetencionIslr: boolean;
  periodKind: string;
};

const errorEs = (code: string, fallback: string): string => {
  switch (code) {
    case "UNAUTHENTICATED":
      return "Tu sesión venció. Entra de nuevo.";
    case "FORBIDDEN":
      return "Solo el administrador edita el perfil fiscal.";
    case "VALIDATION_ERROR":
      return fallback;
    default:
      return fallback;
  }
};

export function FiscalProfileForm({
  companyId,
  initial,
}: {
  companyId: string;
  initial: FiscalProfileInitial;
}) {
  const router = useRouter();
  const toast = useToast();
  const [condicion, setCondicion] = useState(initial.condicionIva);
  const [especialDesde, setEspecialDesde] = useState(initial.contribuyenteEspecialDesde ?? "");
  const [agenteIva, setAgenteIva] = useState(initial.agenteRetencionIva);
  const [agenteIslr, setAgenteIslr] = useState(initial.agenteRetencionIslr);
  const [periodKind, setPeriodKind] = useState(initial.periodKind === "biweekly" ? "biweekly" : "monthly");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (especialDesde !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(especialDesde)) {
      setError("Fecha de contribuyente especial inválida (AAAA-MM-DD).");
      return;
    }
    setBusy(true);
    try {
      const res = await updateFiscalProfileAction(companyId, {
        condicionIva: condicion as "ordinario" | "especial" | "exento" | "no_contribuyente",
        contribuyenteEspecialDesde: especialDesde === "" ? null : especialDesde,
        agenteRetencionIva: agenteIva,
        agenteRetencionIslr: agenteIslr,
        periodKind: periodKind as "monthly" | "biweekly",
      });
      if (!res.ok) {
        setError(errorEs(res.error.code, `${res.error.code}: ${res.error.message}`));
        return;
      }
      toast({ title: "Perfil fiscal actualizado", variant: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    "mt-1.5 h-9 w-full rounded-md border border-periwinkle-300 bg-white px-2.5 text-sm outline-none transition-colors focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:opacity-50";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fisc-condicion">Condición IVA</Label>
          <select
            id="fisc-condicion"
            value={condicion}
            onChange={(e) => setCondicion(e.target.value)}
            disabled={busy}
            className={selectCls}
          >
            <option value="ordinario">Ordinario</option>
            <option value="especial">Especial</option>
            <option value="exento">Exento</option>
            <option value="no_contribuyente">No contribuyente</option>
          </select>
        </div>
        <div>
          <Label htmlFor="fisc-especial">Contribuyente especial desde</Label>
          <Input
            id="fisc-especial"
            type="date"
            value={especialDesde}
            onChange={(e) => setEspecialDesde(e.target.value)}
            disabled={busy}
            className="mt-1.5 tabular-nums"
          />
          <HelpText>Opcional. Vacío = no aplica.</HelpText>
        </div>
      </div>

      <div>
        <Label htmlFor="fisc-period">Período fiscal</Label>
        <select
          id="fisc-period"
          value={periodKind}
          onChange={(e) => setPeriodKind(e.target.value)}
          disabled={busy}
          className={selectCls}
        >
          <option value="monthly">Mensual</option>
          <option value="biweekly">Quincenal</option>
        </select>
        <HelpText>Inmutable con períodos cerrados (requiere ADR).</HelpText>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={agenteIva}
            onChange={(e) => setAgenteIva(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[#352574]"
          />
          Agente de retención IVA
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={agenteIslr}
            onChange={(e) => setAgenteIslr(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[#352574]"
          />
          Agente de retención ISLR
        </label>
        <HelpText>Son condiciones independientes por impuesto.</HelpText>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={busy}>
          <Save aria-hidden />
          {busy ? "Guardando…" : "Guardar perfil"}
        </Button>
      </div>
    </form>
  );
}
