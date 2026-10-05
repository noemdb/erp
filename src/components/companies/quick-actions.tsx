"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ArrowForward from "@mui/icons-material/ArrowForward";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { cn } from "@/lib/utils";

/**
 * Acción principal "Registrar compra" + resto de accesos en dropdown.
 * Sin permiso de escritura (auditor/admin de solo lectura): solo "Ver resumen".
 * Escape/clic-fuera para cerrar, roles menu/menuitem.
 */
export function QuickActions({ companyId, canWrite = true }: { companyId: string; canWrite?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const base = `/c/${companyId}`;

  if (!canWrite) {
    return (
      <Link
        href={`${base}/reportes/resumen-iva`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-periwinkle-200 bg-white px-4 py-2.5 text-sm font-medium text-periwinkle-700 shadow-sm transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]"
      >
        Ver resumen IVA
        <ArrowForward className="h-4 w-4" aria-hidden />
      </Link>
    );
  }
  const items: [string, string][] = [
    ["Panel de empresa", base],
    ["Resumen IVA", `${base}/reportes/resumen-iva`],
    ["Libro de Compras", `${base}/reportes/libro-compras`],
    ["Libro de Ventas", `${base}/reportes/libro-ventas`],
    ["Períodos", `${base}/periodos`],
    ["Bitácora", `${base}/auditoria`],
  ];

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <Link
        href={`${base}/compras/nueva`}
        className="inline-flex items-center gap-1.5 rounded-l-md bg-[#120c27] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#120c27]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
      >
        Registrar compra
        <ArrowForward className="h-4 w-4" aria-hidden />
      </Link>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Más accesos"
        onClick={() => setOpen((v) => !v)}
        className="rounded-r-md border-l border-white/20 bg-[#120c27] px-2.5 text-white shadow-md shadow-[#120c27]/20 transition-colors hover:bg-[#352574]"
      >
        <ExpandMore
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Accesos directos"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-md border border-periwinkle-200 bg-white shadow-xl shadow-periwinkle-200/60"
        >
          <div className="p-1.5">
            {items.map(([label, href]) => (
              <Link
                key={href + label}
                role="menuitem"
                href={href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-periwinkle-700 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
