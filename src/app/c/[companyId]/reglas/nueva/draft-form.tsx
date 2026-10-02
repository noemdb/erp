"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Save from "@mui/icons-material/Save";
import { Button } from "@/components/ui/button";
import { FieldError, HelpText, Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createDraftAction } from "@/modules/rules/actions";
import { ConceptDialog } from "./concept-dialog";

const BASES = ["iva_causado", "monto_pagado", "total_con_iva", "subtotal"];

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const errorEs = (code: string, fallback: string): string => {
  switch (code) {
    case "FORBIDDEN":
      return "Solo el contador crea borradores.";
    case "VALIDATION_ERROR":
      return fallback;
    default:
      return fallback;
  }
};

export function DraftForm({
  companyId,
  concepts,
}: {
  companyId: string;
  concepts: { id: string; codigo: string; nombre: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<"iva" | "islr">("iva");
  const [conceptId, setConceptId] = useState("");
  const [desde, setDesde] = useState(todayISO);
  const [porcentaje, setPorcentaje] = useState(kind === "iva" ? "0.75" : "");
  const [sustraendo, setSustraendo] = useState("0");
  const [base, setBase] = useState("iva_causado");
  const [fuente, setFuente] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickKind(k: "iva" | "islr") {
    setKind(k);
    if (k === "iva") {
      setConceptId("");
      setBase("iva_causado");
      setPorcentaje((p) => (p === "" ? "0.75" : p));
    } else {
      setBase((b) => (b === "iva_causado" ? "monto_pagado" : b));
    }
  }

  const pctPreview = useMemo(() => {
    const n = Number(porcentaje);
    if (porcentaje.trim() === "" || Number.isNaN(n)) return null;
    const pct = n > 0 && n < 1 ? n * 100 : n;
    return `${Number(pct.toFixed(4))} %`;
  }, [porcentaje]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d+(\.\d{1,6})?$/.test(porcentaje.trim())) {
      setError("Porcentaje inválido: usa fracción con hasta 6 decimales (ej. 0.75).");
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(sustraendo.trim())) {
      setError("Sustraendo inválido: hasta 2 decimales (ej. 0).");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      setError("Indica la fecha de vigencia (AAAA-MM-DD).");
      return;
    }
    if (kind === "islr" && !conceptId) {
      setError("ISLR requiere concepto.");
      return;
    }
    if (fuente.trim().length < 3 || motivo.trim().length < 3) {
      setError("Fuente normativa y motivo necesitan al menos 3 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const res = await createDraftAction(companyId, {
        ruleKind: kind,
        conceptId: kind === "islr" ? conceptId : null,
        effectiveFrom: desde,
        porcentaje: porcentaje.trim(),
        sustraendo: sustraendo.trim() || "0",
        baseFormulaKind: base,
        legalReference: fuente.trim(),
        changeReason: motivo.trim(),
      });
      if (!res.ok) {
        setError(errorEs(res.error.code, `${res.error.code}: ${res.error.message}`));
        return;
      }
      toast({ title: "Borrador creado", description: pctPreview ?? undefined, variant: "success" });
      router.push(`/c/${companyId}/reglas/${res.id}`);
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    "mt-1.5 h-9 w-full rounded-md border border-periwinkle-300 bg-white px-2.5 text-sm outline-none transition-colors focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:opacity-50";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="draft-kind">Tipo</Label>
          <select
            id="draft-kind"
            value={kind}
            onChange={(e) => pickKind(e.target.value as "iva" | "islr")}
            disabled={busy}
            className={selectCls}
          >
            <option value="iva">IVA</option>
            <option value="islr">ISLR</option>
          </select>
          <HelpText>
            {kind === "iva"
              ? "IVA no lleva concepto: un porcentaje por vigencia."
              : "ISLR exige concepto de pago (honorarios, alquileres…)."}
          </HelpText>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="draft-concept">Concepto (solo ISLR)</Label>
            <ConceptDialog companyId={companyId} />
          </div>
          <select
            id="draft-concept"
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value)}
            disabled={busy || kind !== "islr"}
            required={kind === "islr"}
            className={selectCls}
          >
            <option value="">—</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="draft-pct">Porcentaje (fracción)</Label>
          <Input
            id="draft-pct"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            placeholder="0.75"
            required
            disabled={busy}
            inputMode="decimal"
            autoComplete="off"
            className="mt-1.5 font-mono tabular-nums"
          />
          <HelpText>{pctPreview ? `Equivale a ${pctPreview}.` : "Ej. 0.75 = 75 %."}</HelpText>
        </div>
        <div>
          <Label htmlFor="draft-sus">Sustraendo</Label>
          <Input
            id="draft-sus"
            value={sustraendo}
            onChange={(e) => setSustraendo(e.target.value)}
            placeholder="0"
            disabled={busy}
            inputMode="decimal"
            autoComplete="off"
            className="mt-1.5 font-mono tabular-nums"
          />
          <HelpText>Solo ISLR: max(0, base × % − sustraendo).</HelpText>
        </div>
        <div>
          <Label htmlFor="draft-desde">Vigente desde</Label>
          <Input
            id="draft-desde"
            type="date"
            required
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            disabled={busy}
            className="mt-1.5 tabular-nums"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="draft-base">Base del cálculo</Label>
        <select
          id="draft-base"
          value={base}
          onChange={(e) => setBase(e.target.value)}
          disabled={busy}
          className={selectCls}
        >
          {BASES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <HelpText>La semántica vive en código; aquí solo el parámetro.</HelpText>
      </div>

      <div>
        <Label htmlFor="draft-fuente">Fuente normativa</Label>
        <Input
          id="draft-fuente"
          value={fuente}
          onChange={(e) => setFuente(e.target.value)}
          placeholder="Providencia SNAT/2025/000054, art. 4"
          required
          maxLength={500}
          disabled={busy}
          autoComplete="off"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="draft-motivo">Motivo del cambio</Label>
        <Textarea
          id="draft-motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          maxLength={500}
          rows={2}
          disabled={busy}
          placeholder="Por qué se crea esta versión"
          className="mt-1.5"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>
          <Save aria-hidden />
          {busy ? "Guardando…" : "Crear borrador"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/c/${companyId}/reglas`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
