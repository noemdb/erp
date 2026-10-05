"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MenuOpen from "@mui/icons-material/MenuOpen";
import Close from "@mui/icons-material/Close";
import CloudUpload from "@mui/icons-material/CloudUpload";
import Approval from "@mui/icons-material/Approval";
import Business from "@mui/icons-material/Business";
import VerifiedUser from "@mui/icons-material/VerifiedUser";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };
type NavGroup = { icon: typeof Business; title: string; links: NavLink[] };

export function CompanyDrawer({
  companyId,
  open,
  onClose,
}: {
  companyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const base = `/c/${companyId}`;
  const groups: NavGroup[] = [
    {
      icon: CloudUpload,
      title: "Registrar",
      links: [
        { label: "Compras", href: `${base}/compras` },
        { label: "Ventas", href: `${base}/ventas` },
        { label: "Pagos", href: `${base}/pagos` },
      ],
    },
    {
      icon: Approval,
      title: "Comprobantes",
      links: [
        { label: "Retenciones IVA", href: `${base}/retenciones` },
        { label: "Retenciones ISLR", href: `${base}/retenciones-islr` },
        { label: "Recibidas", href: `${base}/retenciones-recibidas` },
      ],
    },
    {
      icon: Business,
      title: "Datos base",
      links: [
        { label: "Terceros", href: `${base}/terceros` },
        { label: "Importaciones", href: `${base}/importaciones` },
        { label: "Reglas", href: `${base}/reglas` },
        { label: "Plazos", href: `${base}/plazos` },
        { label: "Configuración", href: `${base}/configuracion` },
      ],
    },
    {
      icon: VerifiedUser,
      title: "Control y reportes",
      links: [
        { label: "Períodos", href: `${base}/periodos` },
        { label: "Libro de Compras", href: `${base}/reportes/libro-compras` },
        { label: "Libro de Ventas", href: `${base}/reportes/libro-ventas` },
        { label: "Resumen IVA", href: `${base}/reportes/resumen-iva` },
        { label: "Bitácora", href: `${base}/auditoria` },
      ],
    },
  ];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Colapsado a la derecha: cuando está cerrado no renderiza nada (no ocupa layout).
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Gestión de la empresa">
      <div className="absolute inset-0 bg-[#120c27]/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col overflow-hidden bg-white shadow-2xl animate-fade-up sm:rounded-l-lg sm:border-l sm:border-periwinkle-200">
        <div className="h-1 shrink-0 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]" aria-hidden />
        <div className="flex items-center justify-between gap-3 border-b border-periwinkle-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
              Gestión de la empresa
            </p>
            <p className="mt-0.5 text-sm font-semibold tracking-tight">Panel · Compras, ventas y control</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú de gestión"
            className="flex h-9 w-9 items-center justify-center rounded-md text-periwinkle-500 outline-none transition-colors hover:bg-periwinkle-100 hover:text-[#120c27] focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
          >
            <Close className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Opciones de gestión">
          <Link
            href={base}
            onClick={onClose}
            className={cn(
              "mb-2 flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === base
                ? "bg-[#120c27] text-white"
                : "text-periwinkle-700 hover:bg-periwinkle-100 hover:text-[#120c27]"
            )}
          >
            Panel de empresa
            <ArrowForward className="h-4 w-4" aria-hidden />
          </Link>
          {groups.map((g) => (
            <section key={g.title} className="mt-3" aria-label={g.title}>
              <p className="flex items-center gap-2 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-periwinkle-400">
                <g.icon className="h-3.5 w-3.5" aria-hidden />
                {g.title}
              </p>
              <ul className="space-y-0.5">
                {g.links.map((l) => {
                  const active = pathname === l.href || pathname?.startsWith(`${l.href}/`);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-periwinkle-100 font-medium text-[#120c27]"
                            : "text-periwinkle-700 hover:bg-periwinkle-100 hover:text-[#120c27]"
                        )}
                      >
                        {l.label}
                        <ArrowForward className="h-3.5 w-3.5 text-periwinkle-300" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
        <div className="border-t border-periwinkle-100 px-5 py-3 text-xs text-periwinkle-500">
          Hecho → motor → comprobante → libro → cierre
        </div>
      </aside>
    </div>
  );
}

export function CompanyDrawerTrigger({ label = "Gestión" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <MenuOpen className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
