"use client";

import { useState } from "react";
import { CompanyDrawer, CompanyDrawerTrigger } from "./company-drawer";

export function CompanyNav({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Abrir menú de gestión de la empresa"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-periwinkle-200 bg-white px-3 py-2 text-sm font-medium text-periwinkle-700 outline-none transition-colors hover:bg-periwinkle-100 hover:text-[#120c27] focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
      >
        <CompanyDrawerTrigger />
      </button>
      <CompanyDrawer companyId={companyId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
