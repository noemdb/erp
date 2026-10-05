"use client";

import { useState } from "react";
import { CompanyDrawer, CompanyDrawerTrigger } from "./company-drawer";

export function CompanyFab({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Abrir menú de gestión de la empresa"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-1.5 rounded-md bg-[#120c27] px-4 py-3 text-sm font-medium text-white shadow-xl shadow-[#120c27]/30 outline-none transition-all hover:-translate-y-0.5 hover:bg-[#352574] focus-visible:ring-2 focus-visible:ring-[#37c8a1] active:translate-y-0"
      >
        <CompanyDrawerTrigger />
      </button>
      <CompanyDrawer companyId={companyId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
