"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Logout from "@mui/icons-material/Logout";
import { Badge } from "@/components/ui/badge";
import { logout } from "@/modules/identity/actions";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "U";
}

export function UserMenu({
  name,
  email,
  role,
  companyCount = 1,
}: {
  name: string;
  email: string;
  role?: string;
  companyCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menú de ${name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-periwinkle-100 focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-[#120c27] to-[#352574] text-sm font-bold text-white shadow-sm"
          aria-hidden
        >
          {initials(name)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-sm font-medium text-periwinkle-900">
            {name}
          </span>
          <span className="block text-xs capitalize text-periwinkle-500">
            {role ?? email}
          </span>
        </span>
        <ExpandMore
          className={cn(
            "hidden h-4 w-4 text-periwinkle-400 transition-transform duration-200 md:block",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Cuenta"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-md border border-periwinkle-200 bg-white shadow-xl shadow-periwinkle-200/60"
        >
          <div className="border-b border-periwinkle-100 px-4 py-3.5">
            <p className="truncate text-sm font-semibold text-periwinkle-900">
              {name}
            </p>
            <p className="truncate text-xs text-periwinkle-500">{email}</p>
            {role && (
              <Badge variant="secondary" className="mt-2 capitalize">
                {role}
              </Badge>
            )}
          </div>
          <div className="p-2">
            {companyCount > 1 && (
              <Link
                role="menuitem"
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-periwinkle-700 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]"
              >
                Mis empresas
              </Link>
            )}
            <Link
              role="menuitem"
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-periwinkle-700 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]"
            >
              Dashboard
            </Link>
            <button
              role="menuitem"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await logout();
                } finally {
                  setBusy(false);
                }
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-periwinkle-700 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27] disabled:opacity-50"
            >
              <Logout className="h-4 w-4" aria-hidden />
              {busy ? "Saliendo…" : "Salir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
