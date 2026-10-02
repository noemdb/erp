"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Save from "@mui/icons-material/Save";
import { Button } from "@/components/ui/button";
import { FieldError, HelpText, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { setTaxProfileAction } from "@/modules/parties/actions";

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ProfileForm({
  companyId,
  partyId,
  onDone,
}: {
  companyId: string;
  partyId: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tipoPersona, setTipoPersona] = useState<"natural" | "juridica">("juridica");
  const [residente, setResidente] = useState(true);
  const [condicionIva, setCondicionIva] = useState("");
  const [sujetoIva, setSujetoIva] = useState(false);
  const [sujetoIslr, setSujetoIslr] = useState(false);
  const [desde, setDesde] = useState(todayISO);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      setError("Indica la fecha de vigencia (AAAA-MM-DD).");
      return;
    }
    setBusy(true);
    try {
      const res = await setTaxProfileAction(companyId, partyId, {
        tipoPersona,
        residente,
        condicionIva: condicionIva.trim() || undefined,
        sujetoRetencionIva: sujetoIva,
        sujetoRetencionIslr: sujetoIslr,
        effectiveFrom: desde,
      });
      if (!res.ok) {
        setError(
          res.error.code === "OVERLAPPING_PROFILE"
            ? "Esa vigencia se solapa con otro perfil."
            : `${res.error.code}: ${res.error.message}`
        );
        return;
      }
      toast({ title: "Perfil fiscal registrado", variant: "success" });
      onDone?.();
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
          <Label htmlFor="prof-tipo">Tipo de persona</Label>
          <select
            id="prof-tipo"
            value={tipoPersona}
            onChange={(e) => setTipoPersona(e.target.value as "natural" | "juridica")}
            disabled={busy}
            className={selectCls}
          >
            <option value="juridica">Jurídica</option>
            <option value="natural">Natural</option>
          </select>
        </div>
        <div>
          <Label htmlFor="prof-desde">Vigente desde</Label>
          <Input
            id="prof-desde"
            type="date"
            required
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            disabled={busy}
            className="mt-1.5 tabular-nums"
          />
          <HelpText>Cierra la vigencia anterior; nunca la sobrescribe.</HelpText>
        </div>
      </div>
      <div>
        <Label htmlFor="prof-condicion">Condición IVA</Label>
        <Input
          id="prof-condicion"
          value={condicionIva}
          onChange={(e) => setCondicionIva(e.target.value)}
          maxLength={50}
          placeholder="ordinario"
          disabled={busy}
          autoComplete="off"
          className="mt-1.5"
        />
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={residente}
            onChange={(e) => setResidente(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[#352574]"
          />
          Residente
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={sujetoIva}
            onChange={(e) => setSujetoIva(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[#352574]"
          />
          Sujeto a retención IVA
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={sujetoIslr}
            onChange={(e) => setSujetoIslr(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[#352574]"
          />
          Sujeto a retención ISLR
        </label>
      </div>
      {error && <FieldError>{error}</FieldError>}
      <div>
        <Button type="submit" disabled={busy}>
          <Save aria-hidden />
          {busy ? "Guardando…" : "Nuevo perfil (cierra el anterior)"}
        </Button>
      </div>
    </form>
  );
}
