"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Save from "@mui/icons-material/Save";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  HelpText,
  Input,
  Label,
  Textarea,
} from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { setTaxProfileAction, upsertPartyAction } from "@/modules/parties/actions";

const RIF_RE = /^[VEJPG]-?\d{8,9}-?\d?$/i;

function normalizeRif(v: string): string {
  return v.toUpperCase().replace(/[\s-]/g, "");
}

const errorEs = (code: string, fallback: string): string => {
  switch (code) {
    case "FORBIDDEN":
      return "Sin permiso para registrar terceros.";
    case "VALIDATION_ERROR":
      return fallback;
    case "NOT_FOUND":
      return "El tercero ya no existe.";
    case "OVERLAPPING_PROFILE":
      return "Esa vigencia se solapa con otro perfil del tercero.";
    default:
      return fallback;
  }
};

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function PartyForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [rif, setRif] = useState("");
  const [razon, setRazon] = useState("");
  const [direccion, setDireccion] = useState("");
  const [withProfile, setWithProfile] = useState(false);
  const [tipoPersona, setTipoPersona] = useState<"natural" | "juridica">("juridica");
  const [residente, setResidente] = useState(true);
  const [sujetoIva, setSujetoIva] = useState(false);
  const [sujetoIslr, setSujetoIslr] = useState(false);
  const [vigenteDesde, setVigenteDesde] = useState(todayISO);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rifValid = useMemo(() => rif.trim() === "" || RIF_RE.test(rif.trim()), [rif]);
  const normalized = useMemo(() => normalizeRif(rif.trim()), [rif]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!RIF_RE.test(rif.trim())) {
      setError("RIF inválido (ej. J-12345678-9).");
      return;
    }
    if (razon.trim().length < 2) {
      setError("La razón social necesita al menos 2 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const res = await upsertPartyAction(companyId, {
        rif: rif.trim(),
        razonSocial: razon.trim(),
        direccionFiscal: direccion.trim() || undefined,
      });
      if (!res.ok) {
        setError(errorEs(res.error.code, `${res.error.code}: ${res.error.message}`));
        return;
      }
      if (withProfile) {
        const prof = await setTaxProfileAction(companyId, res.id, {
          tipoPersona,
          residente,
          sujetoRetencionIva: sujetoIva,
          sujetoRetencionIslr: sujetoIslr,
          effectiveFrom: vigenteDesde,
        });
        if (!prof.ok) {
          setError(errorEs(prof.error.code, `${prof.error.code}: ${prof.error.message}`));
          return;
        }
      }
      toast({
        title: "Tercero guardado",
        description: `${razon.trim()} · ${rif.trim().toUpperCase()}`,
        variant: "success",
      });
      router.push(`/c/${companyId}/terceros/${res.id}`);
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
          <Label htmlFor="party-rif">RIF</Label>
          <Input
            id="party-rif"
            name="rif"
            required
            value={rif}
            onChange={(e) => setRif(e.target.value)}
            placeholder="J-12345678-9"
            autoComplete="off"
            maxLength={20}
            aria-invalid={!rifValid}
            className="mt-1.5 font-mono uppercase"
          />
          {!rifValid ? (
            <FieldError>RIF inválido (ej. J-12345678-9).</FieldError>
          ) : (
            <HelpText>
              {rif.trim() === ""
                ? "Letra + número, con o sin guiones."
                : `Se guarda “${rif.trim()}” y se busca como “${normalized}”.`}
            </HelpText>
          )}
        </div>
        <div>
          <Label htmlFor="party-razon">Razón social</Label>
          <Input
            id="party-razon"
            name="razonSocial"
            required
            value={razon}
            onChange={(e) => setRazon(e.target.value)}
            maxLength={200}
            autoComplete="off"
            className="mt-1.5"
          />
          <HelpText>Nombre fiscal exacto del documento.</HelpText>
        </div>
      </div>

      <div>
        <Label htmlFor="party-direccion">Dirección fiscal</Label>
        <Textarea
          id="party-direccion"
          name="direccionFiscal"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Opcional"
          className="mt-1.5"
        />
      </div>

      <fieldset className="rounded-md border border-periwinkle-200 p-4">
        <legend className="px-1 text-sm font-medium">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={withProfile}
              onChange={(e) => setWithProfile(e.target.checked)}
              className="h-4 w-4 accent-[#352574]"
            />
            Perfil fiscal inicial
          </label>
        </legend>
        {withProfile ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="party-tipo">Tipo de persona</Label>
              <select
                id="party-tipo"
                value={tipoPersona}
                onChange={(e) =>
                  setTipoPersona(e.target.value as "natural" | "juridica")
                }
                disabled={busy}
                className={selectCls}
              >
                <option value="juridica">Jurídica</option>
                <option value="natural">Natural</option>
              </select>
            </div>
            <div>
              <Label htmlFor="party-desde">Vigente desde</Label>
              <Input
                id="party-desde"
                type="date"
                required={withProfile}
                value={vigenteDesde}
                onChange={(e) => setVigenteDesde(e.target.value)}
                disabled={busy}
                className="mt-1.5 tabular-nums"
              />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={residente}
                onChange={(e) => setResidente(e.target.checked)}
                className="h-4 w-4 accent-[#352574]"
              />
              Residente
            </label>
            <div className="flex flex-col gap-2 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={sujetoIva}
                  onChange={(e) => setSujetoIva(e.target.checked)}
                  className="h-4 w-4 accent-[#352574]"
                />
                Sujeto a retención IVA
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={sujetoIslr}
                  onChange={(e) => setSujetoIslr(e.target.checked)}
                  className="h-4 w-4 accent-[#352574]"
                />
                Sujeto a retención ISLR
              </label>
            </div>
          </div>
        ) : (
          <p className="text-xs text-periwinkle-500">
            Podrás crearlo después desde el detalle; las retenciones lo
            necesitan para aplicar.
          </p>
        )}
      </fieldset>

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
          {busy ? "Guardando…" : "Guardar tercero"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/c/${companyId}/terceros`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
