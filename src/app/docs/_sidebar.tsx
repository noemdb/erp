"use client";

import { useState } from "react";
import Link from "next/link";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import EditNote from "@mui/icons-material/EditNote";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import PointOfSale from "@mui/icons-material/PointOfSale";
import Payments from "@mui/icons-material/Payments";
import Description from "@mui/icons-material/Description";
import Calculate from "@mui/icons-material/Calculate";
import Inbox from "@mui/icons-material/Inbox";
import People from "@mui/icons-material/People";
import UploadFile from "@mui/icons-material/UploadFile";
import Rule from "@mui/icons-material/Rule";
import Settings from "@mui/icons-material/Settings";
import Schedule from "@mui/icons-material/Schedule";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import MenuBook from "@mui/icons-material/MenuBook";
import Summarize from "@mui/icons-material/Summarize";
import History from "@mui/icons-material/History";
import FolderOpen from "@mui/icons-material/FolderOpen";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { cn } from "@/lib/utils";
import { DOC_SECTIONS } from "./content";

const SECTION_ICONS: Record<string, typeof EditNote> = {
  "1": EditNote,
  "2": ReceiptLong,
  "3": FolderOpen,
  "4": Summarize,
  "5": MenuBook,
};

const PAGE_ICONS: Record<string, typeof EditNote> = {
  "/docs/registrar/compras": ReceiptLong,
  "/docs/registrar/ventas": PointOfSale,
  "/docs/registrar/pagos": Payments,
  "/docs/comprobantes/iva": Description,
  "/docs/comprobantes/islr": Calculate,
  "/docs/comprobantes/recibidas": Inbox,
  "/docs/datos-base/terceros": People,
  "/docs/datos-base/importaciones": UploadFile,
  "/docs/datos-base/reglas": Rule,
  "/docs/datos-base/configuracion": Settings,
  "/docs/datos-base/plazos": Schedule,
  "/docs/control/periodos": CalendarMonth,
  "/docs/control/libro-compras": MenuBook,
  "/docs/control/libro-ventas": MenuBook,
  "/docs/control/resumen-iva": Summarize,
  "/docs/control/bitacora": History,
  "/docs/caso-practico/resumen": MenuBook,
  "/docs/caso-practico/carga": UploadFile,
  "/docs/caso-practico/comprobacion": Calculate,
  "/docs/caso-practico/cierre": History,
};

export function DocsSidebar({ current }: { current?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <aside
      className={cn(
        "lg:sticky lg:top-24 lg:self-start lg:shrink-0",
        collapsed ? "lg:w-14" : "lg:w-60"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {!collapsed && (
          <p className="text-xs font-semibold uppercase tracking-wider text-periwinkle-400">
            Índice
          </p>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir índice" : "Colapsar índice"}
          title={collapsed ? "Expandir índice" : "Colapsar índice"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-periwinkle-200 text-periwinkle-500 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
        >
          <ToggleIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <nav aria-label="Documentación" className="mt-3">
        {collapsed ? (
          <ul className="space-y-1">
            {DOC_SECTIONS.flatMap((s) =>
              s.pages
                .filter((p) => p.available)
                .map((p) => {
                  const Icon = PAGE_ICONS[p.href] ?? Description;
                  const active = current === p.href;
                  return (
                    <li key={p.href}>
                      <Link
                        href={p.href}
                        title={`${s.title} · ${p.title}`}
                        aria-label={`${s.title} · ${p.title}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                          active
                            ? "bg-[#120c27] text-white"
                            : "text-periwinkle-500 hover:bg-periwinkle-100 hover:text-[#120c27]"
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </Link>
                    </li>
                  );
                })
            )}
          </ul>
        ) : (
          <div className="space-y-6">
            {DOC_SECTIONS.map((s) => {
              const SectionIcon = SECTION_ICONS[s.id] ?? FolderOpen;
              return (
                <div key={s.id}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-periwinkle-400">
                    <SectionIcon className="h-4 w-4" aria-hidden />
                    {s.id}. {s.title}
                  </p>
                  <p className="mt-0.5 text-xs text-periwinkle-500">
                    {s.tagline}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {s.pages.map((p) => {
                      const active = current === p.href;
                      const href = p.available ? p.href : "/docs";
                      const Icon = PAGE_ICONS[p.href] ?? Description;
                      return (
                        <li key={p.href}>
                          <Link
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                              active
                                ? "bg-[#120c27] font-medium text-white"
                                : "text-periwinkle-700 hover:bg-periwinkle-100 hover:text-[#120c27]"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                active
                                  ? "text-white"
                                  : "text-periwinkle-400"
                              )}
                              aria-hidden
                            />
                            {p.title}
                            {!p.available && (
                              <span className="ml-2 text-xs opacity-60">
                                (pronto)
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-periwinkle-500 hover:text-[#120c27]"
      >
        <ArrowBack className="h-4 w-4" aria-hidden />
        {!collapsed && "Volver al dashboard"}
      </Link>
    </aside>
  );
}
