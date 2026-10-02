"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Save from "@mui/icons-material/Save";
import { Button } from "@/components/ui/button";
import { HelpText, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { upsertObligationAction, addHolidayAction } from "@/modules/deadlines/actions";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ObligationForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState("iva_entrega");
  const [fuente, setFuente] = useState("");
  const [articulo, setArticulo] = useState("");
  const [desde, setDesde] = useState(todayISO);
  const [dias, setDias] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(dias);
    if (!Number.isInteger(n) || n < 1 || n > 30) {
      setError("Días hábiles: entero entre 1 y 30.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      setError("Vigencia inválida (AAAA-MM-DD).");
      return;
    }
    if (fuente.trim().length < 3 || articulo.trim().length < 1) {
      setError("Fuente y artículo son requeridos.");
      return;
    }
    setBusy(true);
    try {
      const res = await upsertObligationAction(companyId, {
        kind,
        fuenteNormativa: fuente.trim(),
        articulo: articulo.trim(),
        effectiveFrom: desde,
        diasHabiles: n,
      });
      if (!res.ok) {
        setError(`${res.error.code}: ${res.error.message}`);
        return;
      }
      toast({ title: "Obligación guardada", variant: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    "mt-1.5 h-9 w-full rounded-md border border-periwinkle-300 bg-white px-2.5 text-sm outline-none transition-colors focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:opacity-50";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 border-t border-periwinkle-100 pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ob-kind">Tipo</Label>
          <select
            id="ob-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={busy}
            className={selectCls}
          >
            <option value="iva_entrega">Entrega IVA</option>
            <option value="islr_entrega">Entrega ISLR</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ob-dias">Días hábiles</Label>
          <Input
            id="ob-dias"
            type="number"
            min={1}
            max={30}
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            required
            disabled={busy}
            className="mt-1.5 tabular-nums"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ob-fuente">Fuente normativa</Label>
          <Input
            id="ob-fuente"
            value={fuente}
            onChange={(e) => setFuente(e.target.value)}
            placeholder="Providencia SNAT/2025/000054"
            required
            maxLength={300}
            disabled={busy}
            autoComplete="off"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="ob-art">Artículo</Label>
          <Input
            id="ob-art"
            value={articulo}
            onChange={(e) => setArticulo(e.target.value)}
            placeholder="16"
            required
            maxLength={100}
            disabled={busy}
            autoComplete="off"
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="ob-desde">Vigente desde</Label>
        <Input
          id="ob-desde"
          type="date"
          required
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          disabled={busy}
          className="mt-1.5 tabular-nums"
        />
        <HelpText>Guardar reemplaza los valores de ese tipo.</HelpText>
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
          {busy ? "Guardando…" : "Guardar obligación"}
        </Button>
      </div>
    </form>
  );
}

export function HolidayForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setError("Fecha inválida (AAAA-MM-DD).");
      return;
    }
    setBusy(true);
    try {
      const res = await addHolidayAction(companyId, fecha, descripcion.trim() || undefined);
      if (!res.ok) {
        setError(
          res.error.code === "DUPLICATE_DOCUMENT"
            ? "Ese feriado ya existe."
            : `${res.error.code}: ${res.error.message}`
        );
        return;
      }
      toast({ title: "Feriado agregado", variant: "success" });
      setFecha("");
      setDescripcion("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 border-t border-periwinkle-100 pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="hol-fecha">Fecha</Label>
          <Input
            id="hol-fecha"
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            disabled={busy}
            className="mt-1.5 tabular-nums"
          />
        </div>
        <div>
          <Label htmlFor="hol-desc">Descripción</Label>
          <Input
            id="hol-desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Opcional"
            maxLength={200}
            disabled={busy}
            autoComplete="off"
            className="mt-1.5"
          />
        </div>
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
          {busy ? "Guardando…" : "Agregar feriado"}
        </Button>
      </div>
    </form>
  );
}
