"use client";

import { useState } from "react";
import Link from "next/link";
import AccountBalance from "@mui/icons-material/AccountBalance";
import ArrowForward from "@mui/icons-material/ArrowForward";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export type SwitchCompany = {
  id: string;
  razonSocial: string;
  rifOriginal: string;
  condicionIva: string;
  logoUrl: string | null;
  role: string | null;
  periodText: string | null;
};

/** Logo o inicial de la empresa. */
function CompanyMark({
  company,
  size = "md",
  dark = false,
}: {
  company: Pick<SwitchCompany, "razonSocial" | "logoUrl">;
  size?: "sm" | "md" | "lg";
  dark?: boolean;
}) {
  const box =
    size === "lg"
      ? "h-12 w-12 rounded-md text-lg"
      : size === "sm"
        ? "h-5 w-5 rounded-sm text-[10px]"
        : "h-9 w-9 rounded-md text-sm";
  if (company.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt=""
        aria-hidden
        loading="lazy"
        className={cn(box, "shrink-0 bg-white/90 object-contain p-0.5 shadow-sm")}
      />
    );
  }
  const initial = (company.razonSocial.trim().charAt(0) || "E").toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-bold",
        box,
        dark ? "bg-white/20 text-white" : "bg-periwinkle-100 text-[#120c27]"
      )}
    >
      {initial}
    </span>
  );
}

/**
 * Botón de empresa actual + diálogo grande (~90%) con la lista seleccionable.
 * Solo en modo empresa seleccionada del dashboard.
 */
export function CompanySwitch({
  companies,
  selectedId,
}: {
  companies: SwitchCompany[];
  selectedId: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = companies.find((c) => c.id === selectedId) ?? companies[0];
  if (!selected) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Cambiar de empresa"
        className="flex min-w-0 max-w-72 items-center gap-2 rounded-md bg-[#120c27] py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-white shadow-md shadow-[#120c27]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
      >
        <CompanyMark company={selected} size="sm" dark />
        <span className="min-w-0 flex-1 truncate text-left">
          {selected.razonSocial}
        </span>
        <ExpandMore className="h-4 w-4 shrink-0" aria-hidden />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        label="Seleccionar empresa"
        dialogClassName="animate-fade-up relative max-h-[90vh] w-[90%] max-w-6xl overflow-y-auto rounded-md border border-periwinkle-200 bg-white shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Seleccionar empresa
            </h2>
            <p className="mt-1 text-sm text-periwinkle-500">
              {companies.length}{" "}
              {companies.length === 1 ? "empresa" : "empresas"} · cada una
              opera aislada con su propio RIF, períodos y reportes.
            </p>
          </div>
        </div>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {companies.map((c) => {
            const active = c.id === selectedId;
            return (
              <li key={c.id}>
                <Link
                  href={`/dashboard?company=${c.id}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-full items-center gap-4 rounded-md border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                    active
                      ? "border-transparent ring-2 ring-[#352574]"
                      : "border-periwinkle-200"
                  )}
                >
                  <CompanyMark company={c} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="truncate font-semibold tracking-tight text-[#120c27]">
                        {c.razonSocial}
                      </strong>
                      {active && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-icy-aqua-100 px-2 py-0.5 text-[11px] font-semibold text-icy-aqua-700">
                          <CheckCircle className="h-3 w-3" aria-hidden />
                          Actual
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-periwinkle-500">
                      RIF {c.rifOriginal}
                    </span>
                    <span className="mt-1 block truncate text-sm text-periwinkle-600">
                      {c.condicionIva}
                      {c.role ? ` · Rol ${c.role}` : ""}
                      {c.periodText ? ` · ${c.periodText}` : ""}
                    </span>
                  </span>
                  {active ? (
                    <CheckCircle
                      className="h-5 w-5 shrink-0 text-icy-aqua-700"
                      aria-hidden
                    />
                  ) : (
                    <ArrowForward
                      className="h-5 w-5 shrink-0 text-periwinkle-300"
                      aria-hidden
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        {companies.length === 0 && (
          <p className="mt-5 flex items-center gap-2 text-sm text-periwinkle-500">
            <AccountBalance className="h-4 w-4" aria-hidden />
            Sin empresas todavía.
          </p>
        )}
      </Modal>
    </>
  );
}
