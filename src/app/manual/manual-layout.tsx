"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import AssignmentTurnedIn from "@mui/icons-material/AssignmentTurnedIn";
import CloudUpload from "@mui/icons-material/CloudUpload";
import FindInPage from "@mui/icons-material/FindInPage";
import Group from "@mui/icons-material/Group";
import MenuBook from "@mui/icons-material/MenuBook";
import { cn } from "@/lib/utils";

export type ManualNavFn = { id: string; title: string };
export type ManualNavRole = { id: string; rol: string; badge: string; fns: ManualNavFn[] };

const ROLE_ICONS: Record<string, typeof MenuBook> = {
  contador: AssignmentTurnedIn,
  administrativo: CloudUpload,
  auditor: FindInPage,
  adm: Group,
};

/** Índice colapsable del manual — mismo patrón que DocsSidebar (/docs). */
export function ManualLayout({ roles, children }: { roles: ManualNavRole[]; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hash, setHash] = useState("");
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  useEffect(() => {
    const sync = () => setHash(window.location.hash.slice(1));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Scroll-spy: el resaltado sigue la sección visible, no solo el último clic.
  useEffect(() => {
    const ids = [...roles.flatMap((r) => [r.id, ...r.fns.map((f) => f.id)]), "diagramas"];
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setHash(e.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [roles]);

  const activeRole = (roleId: string) => hash === roleId || hash.startsWith(`${roleId}-`);

  return (
    <div className="pt-10 lg:flex lg:gap-8">
      <aside
        className={cn(
          "mb-8 lg:mb-0 lg:sticky lg:top-24 lg:self-start lg:shrink-0 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-4",
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

        <nav aria-label="Manual de Usuario" className="mt-3">
          {collapsed ? (
            <ul className="space-y-1">
              {roles.map((r) => {                const Icon = ROLE_ICONS[r.id] ?? MenuBook;
                const active = activeRole(r.id);
                return (
                  <li key={r.id}>
                    <Link
                      href={`#${r.id}`}
                      title={r.rol}
                      aria-label={r.rol}
                      aria-current={active ? "true" : undefined}
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
              })}
              <li>
                <Link
                  href="#diagramas"
                  title="Diagramas"
                  aria-label="Diagramas"
                  aria-current={hash === "diagramas" ? "true" : undefined}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                    hash === "diagramas"
                      ? "bg-[#120c27] text-white"
                      : "text-periwinkle-500 hover:bg-periwinkle-100 hover:text-[#120c27]"
                  )}
                >
                  <MenuBook className="h-5 w-5" aria-hidden />
                </Link>
              </li>
            </ul>
          ) : (
            <div className="space-y-6">
              {roles.map((r) => {
                const SectionIcon = ROLE_ICONS[r.id] ?? MenuBook;
                return (
                  <div key={r.id}>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-periwinkle-400">
                      <SectionIcon className="h-4 w-4" aria-hidden />
                      {r.rol}
                    </p>
                    <p className="mt-0.5 text-xs text-periwinkle-500">{r.badge}</p>
                    <ul className="mt-2 space-y-1">
                      {r.fns.map((f) => {
                        const active = hash === f.id;
                        return (
                          <li key={f.id}>
                            <Link
                              href={`#${f.id}`}
                              aria-current={active ? "true" : undefined}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                                active
                                  ? "bg-[#120c27] font-medium text-white"
                                  : "text-periwinkle-700 hover:bg-periwinkle-100 hover:text-[#120c27]"
                              )}
                            >
                              <ArrowForward
                                className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-periwinkle-400")}
                                aria-hidden
                              />
                              {f.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              <div>
                <Link
                  href="#diagramas"
                  aria-current={hash === "diagramas" ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    hash === "diagramas"
                      ? "bg-[#120c27] font-medium text-white"
                      : "text-periwinkle-700 hover:bg-periwinkle-100 hover:text-[#120c27]"
                  )}
                >
                  <MenuBook
                    className={cn("h-4 w-4 shrink-0", hash === "diagramas" ? "text-white" : "text-periwinkle-400")}
                    aria-hidden
                  />
                  Diagramas
                </Link>
              </div>
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

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
