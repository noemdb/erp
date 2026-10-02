"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Add from "@mui/icons-material/Add";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createPeriodAction } from "@/modules/periods/actions";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const errorEs: Record<string, string> = {
  FORBIDDEN: "Solo el contador puede registrar períodos.",
  VALIDATION_ERROR: "Revisa el año, el mes y la quincena.",
  NOT_FOUND: "La empresa ya no existe.",
  PERIOD_CLOSED: "No se pudo registrar el período. Inténtalo de nuevo.",
};

export function CreatePeriodForm({
  companyId,
  defaultKind,
  onDone,
}: {
  companyId: string;
  defaultKind: "monthly" | "biweekly";
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const now = new Date();
  const [kind, setKind] = useState<"monthly" | "biweekly">(defaultKind);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [half, setHalf] = useState<"Q1" | "Q2">("Q1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await createPeriodAction(companyId, {
        kind,
        year: Number(year),
        month: Number(month),
        half: kind === "biweekly" ? half : undefined,
      });
      if (!res.ok) {
        const code = (res.error as { code?: string } | undefined)?.code ?? "";
        setError(errorEs[code] ?? "Ocurrió un error. Inténtalo de nuevo.");
      } else if (!res.created) {
        toast({
          title: "El período ya estaba registrado",
          description: `${MONTHS[Number(month) - 1]} de ${year}${kind === "biweekly" ? ` · ${half}` : ""}`,
          variant: "info",
        });
        setNotice("Ese período ya estaba registrado.");
        router.refresh();
      } else {
        toast({
          title: "Período registrado",
          description: `${MONTHS[Number(month) - 1]} de ${year}${kind === "biweekly" ? ` · ${half}` : ""}`,
          variant: "success",
        });
        onDone?.();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-9 w-full rounded-md border border-periwinkle-300 bg-white px-2.5 text-sm outline-none transition-colors focus:border-[#352574] focus:ring-2 focus:ring-[#37c8a1]/40 disabled:opacity-50";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium">
          Tipo
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "monthly" | "biweekly")}
            disabled={busy}
            className={`${inputCls} mt-1.5`}
          >
            <option value="monthly">Mensual</option>
            <option value="biweekly">Quincenal</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Año
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={busy}
            required
            className={`${inputCls} mt-1.5 tabular-nums`}
          />
        </label>
        <label className="block text-sm font-medium">
          Mes
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={busy}
            className={`${inputCls} mt-1.5`}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {kind === "biweekly" && (
          <label className="block text-sm font-medium">
            Quincena
            <select
              value={half}
              onChange={(e) => setHalf(e.target.value as "Q1" | "Q2")}
              disabled={busy}
              className={`${inputCls} mt-1.5`}
            >
              <option value="Q1">Q1 (días 1–15)</option>
              <option value="Q2">Q2 (día 16 en adelante)</option>
            </select>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          <Add aria-hidden />
          {busy ? "Registrando…" : "Registrar período"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-periwinkle-500">
            {notice}
          </p>
        )}
      </div>
    </form>
  );
}
