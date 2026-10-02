"use client";

import { useState } from "react";
import Add from "@mui/icons-material/Add";
import Edit from "@mui/icons-material/Edit";
import { Modal } from "@/components/ui/modal";
import { CompanyForm, type CompanyInitial } from "./company-form";
import { cn } from "@/lib/utils";

/** Botón "Nueva empresa" que abre el registro en diálogo. */
export function NewCompanyButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-[#120c27] px-4 py-2 text-sm font-medium text-white shadow-md shadow-[#120c27]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]",
          className
        )}
      >
        <Add className="h-4 w-4" aria-hidden />
        Nueva empresa
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label="Registrar empresa" wide>
        <h2 className="text-xl font-bold tracking-tight">Registrar empresa</h2>
        <p className="mt-1 text-sm text-periwinkle-500">
          Cada empresa opera aislada con su propio RIF, períodos y reportes.
        </p>
        <div className="mt-5">
          <CompanyForm />
        </div>
      </Modal>
    </>
  );
}

/** Botón "Editar" por tarjeta (requiere admin de la empresa). */
export function EditCompanyButton({
  company,
  iconOnly = false,
}: {
  company: { id: string } & CompanyInitial;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Editar ${company.razonSocial}`}
        title="Editar empresa"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-periwinkle-200 bg-white text-sm font-medium text-periwinkle-600 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]",
          iconOnly ? "px-2.5 py-2" : "px-3 py-2"
        )}
      >
        <Edit className="h-4 w-4" aria-hidden />
        {!iconOnly && "Editar"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label={`Editar ${company.razonSocial}`} wide>
        <h2 className="truncate text-xl font-bold tracking-tight">
          Editar empresa
        </h2>
        <p className="mt-1 truncate font-mono text-xs text-periwinkle-500">
          RIF {company.rif}
        </p>
        <div className="mt-5">
          <CompanyForm
            companyId={company.id}
            initial={company}
            onDone={() => setOpen(false)}
          />
        </div>
      </Modal>
    </>
  );
}
