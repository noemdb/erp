"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ArrowForward from "@mui/icons-material/ArrowForward";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { LogoPicker } from "./logo-picker";
import {
  createCompanyAction,
  updateCompanyAction,
} from "@/modules/tenancy/companies-actions";

const inputClassName =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";

export type CompanyInitial = {
  rif: string;
  razonSocial: string;
  condicionIva: string;
  domicilioFiscal?: string | null;
  nombreComercial?: string | null;
  telefono?: string | null;
  emailContacto?: string | null;
  colorDistintivo?: string | null;
  logoUrl?: string | null;
};

const CONDICIONES = [
  "ordinario",
  "especial",
  "exento",
  "no_contribuyente",
] as const;
type Condicion = (typeof CONDICIONES)[number];

function toCondicion(raw: string): Condicion | undefined {
  return (CONDICIONES as readonly string[]).includes(raw)
    ? (raw as Condicion)
    : undefined;
}

export function CompanyForm({
  companyId,
  initial,
  onDone,
}: {
  /** Sin companyId crea; con companyId edita (requiere admin). */
  companyId?: string;
  initial?: CompanyInitial;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState(initial?.colorDistintivo ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const editing = Boolean(companyId);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const payload = {
          rif: String(fd.get("rif") ?? ""),
          razonSocial: String(fd.get("razonSocial") ?? ""),
          condicionIva: toCondicion(String(fd.get("condicionIva") ?? "")),
          domicilioFiscal: String(fd.get("domicilioFiscal") ?? "") || undefined,
          nombreComercial: String(fd.get("nombreComercial") ?? "") || undefined,
          telefono: String(fd.get("telefono") ?? "") || undefined,
          emailContacto: String(fd.get("emailContacto") ?? "") || undefined,
          colorDistintivo: String(fd.get("colorDistintivo") ?? "") || undefined,
          logoUrl: logoUrl || undefined,
        };
        try {
          const res = editing
            ? await updateCompanyAction(companyId!, payload)
            : await createCompanyAction(payload);
          if (!res.ok) {
            setError(`${res.error.code}: ${res.error.message}`);
          } else if (editing) {
            toast({ title: "Cambios guardados", variant: "success" });
            onDone?.();
            router.refresh();
          } else {
            toast({ title: "Empresa creada", variant: "success" });
            router.push(`/c/${res.id}`);
          }
        } catch {
          setError("Error de conexión. Intenta de nuevo.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="rif" className="text-sm font-medium text-periwinkle-700">
            RIF
          </label>
          <input
            id="rif"
            name="rif"
            required
            placeholder="J-12345678-9"
            defaultValue={initial?.rif ?? ""}
            disabled={busy}
            className={`${inputClassName} font-mono`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="condicionIva" className="text-sm font-medium text-periwinkle-700">
            Condición IVA
          </label>
          <select
            id="condicionIva"
            name="condicionIva"
            defaultValue={initial?.condicionIva ?? "ordinario"}
            disabled={busy}
            className={`${inputClassName} pr-8`}
          >
            <option value="ordinario">Ordinario</option>
            <option value="especial">Contribuyente especial</option>
            <option value="exento">Exento</option>
            <option value="no_contribuyente">No contribuyente</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="razonSocial" className="text-sm font-medium text-periwinkle-700">
          Razón social
        </label>
        <input
          id="razonSocial"
          name="razonSocial"
          required
          placeholder="Comercial Andina, C.A."
          defaultValue={initial?.razonSocial ?? ""}
          disabled={busy}
          className={inputClassName}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="domicilioFiscal" className="text-sm font-medium text-periwinkle-700">
          Domicilio fiscal <span className="font-normal text-periwinkle-400">(opcional)</span>
        </label>
        <input
          id="domicilioFiscal"
          name="domicilioFiscal"
          placeholder="Av. Principal, Caracas"
          defaultValue={initial?.domicilioFiscal ?? ""}
          disabled={busy}
          className={inputClassName}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="nombreComercial" className="text-sm font-medium text-periwinkle-700">
            Nombre comercial
          </label>
          <input
            id="nombreComercial"
            name="nombreComercial"
            placeholder="Daka"
            defaultValue={initial?.nombreComercial ?? ""}
            disabled={busy}
            className={inputClassName}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="telefono" className="text-sm font-medium text-periwinkle-700">
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            placeholder="+58 212 1234567"
            defaultValue={initial?.telefono ?? ""}
            disabled={busy}
            className={inputClassName}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="emailContacto" className="text-sm font-medium text-periwinkle-700">
            Correo contacto
          </label>
          <input
            id="emailContacto"
            name="emailContacto"
            type="email"
            placeholder="contacto@empresa.com"
            defaultValue={initial?.emailContacto ?? ""}
            disabled={busy}
            className={inputClassName}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="colorDistintivo" className="text-sm font-medium text-periwinkle-700">
            Color distintivo <span className="font-normal text-periwinkle-400">(opcional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="Elegir color"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#352574"}
              onChange={(e) => setColor(e.target.value)}
              disabled={busy}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-periwinkle-300 bg-white p-1 disabled:opacity-50"
            />
            <input
              id="colorDistintivo"
              name="colorDistintivo"
              placeholder="#352574"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={busy}
              className={`${inputClassName} font-mono`}
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-periwinkle-700">
            Logo PNG <span className="font-normal text-periwinkle-400">(opcional)</span>
          </span>
          <input type="hidden" name="logoUrl" value={logoUrl} />
          <LogoPicker value={logoUrl} onChange={setLogoUrl} disabled={busy} />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full rounded-md">
        {busy ? (
          <>
            <Spinner label={editing ? "Guardando empresa" : "Creando empresa"} />
            {editing ? "Guardando…" : "Creando…"}
          </>
        ) : (
          <>
            {editing ? "Guardar cambios" : "Crear empresa"}{" "}
            <ArrowForward aria-hidden />
          </>
        )}
      </Button>
      {!editing && (
        <p className="text-xs leading-relaxed text-periwinkle-400">
          Quedarás como administrador de la empresa. El RIF no puede repetirse.
        </p>
      )}
    </form>
  );
}
