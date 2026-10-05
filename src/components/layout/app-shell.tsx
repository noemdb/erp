import Link from "next/link";
import AccountBalance from "@mui/icons-material/AccountBalance";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { UserMenu } from "./user-menu";
import { CompanyNav } from "./company-nav";

export type ShellUser = { name: string; email: string };

/** Acepta solo `#rrggbb`; cualquier otro valor se ignora. */
export function safeAccent(color: string | null | undefined): string | null {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)
    ? color
    : null;
}

/** Encabezado único de la app interna: marca + contexto + menú de usuario. */
export function AppHeader({
  title,
  back,
  user,
  role,
  companyCount = 1,
  branding,
  companyId,
}: {
  /** Título junto al logo (empresa, sección). */
  title: string;
  /** Atrás. Omitirlo si no hay a dónde volver. */
  back?: { href: string; label: string };
  user: ShellUser;
  /** Rol en la empresa actual (solo panel de empresa). */
  role?: string;
  companyCount?: number;
  /** Branding de la empresa actual (solo panel de empresa). */
  branding?: { color?: string | null; logoUrl?: string | null };
  /** Si se informa, muestra el botón "Gestión" que abre el drawer derecho. */
  companyId?: string;
}) {
  const accent = safeAccent(branding?.color ?? null);
  return (
    <header className="sticky top-0 z-40 border-b border-periwinkle-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-3">
          {back && (
            <>
              <Link
                href={back.href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
              >
                <ArrowBack className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{back.label}</span>
              </Link>
              <span
                className="hidden h-5 w-px bg-periwinkle-200 sm:inline"
                aria-hidden
              />
            </>
          )}
          <span className="flex min-w-0 items-center gap-2.5">
            {branding?.logoUrl ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-periwinkle-200 bg-white p-1 shadow-sm">
                <img
                  src={branding.logoUrl}
                  alt={`Logo de ${title}`}
                  className="h-full w-full object-contain"
                />
              </span>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#120c27] to-[#352574] text-white shadow-sm">
                <AccountBalance className="h-4 w-4" aria-hidden />
              </span>
            )}
            <span className="truncate text-sm font-semibold tracking-tight">
              {title}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {companyId && <CompanyNav companyId={companyId} />}
          <UserMenu
            name={user.name}
            email={user.email}
            role={role}
            companyCount={companyCount}
          />
        </div>
      </div>
      <div
        className="h-0.5 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
        style={accent ? { background: accent } : undefined}
        aria-hidden
      />
    </header>
  );
}

/** Pie único de la app interna. */
export function PageFooter({ context }: { context?: string }) {
  return (
    <footer className="border-t border-periwinkle-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-periwinkle-500 sm:flex-row sm:items-center sm:justify-between">
        <p>ERP-TributarioLite{context ? ` · ${context}` : ""}</p>
        <p>Hecho → motor → comprobante → libro → cierre</p>
      </div>
    </footer>
  );
}
