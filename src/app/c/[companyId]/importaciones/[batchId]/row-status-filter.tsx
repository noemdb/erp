"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type RowStatusOption = { value: string; label: string; count: number };

function hrefFor(baseHref: string, next: string[]) {
  if (next.length === 0) return baseHref;
  const qs = next.map((s) => `estado=${encodeURIComponent(s)}`).join("&");
  return `${baseHref}?${qs}`;
}

export function RowStatusFilter({
  selected,
  baseHref,
  total,
  options,
}: {
  selected: string[];
  baseHref: string;
  total: number;
  options: RowStatusOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const toggle = (v: string) => {
    const next = selected.includes(v)
      ? selected.filter((s) => s !== v)
      : [...selected, v];
    router.push(hrefFor(baseHref, next));
  };

  const visibleCount =
    selected.length === 0
      ? total
      : options
          .filter((o) => selected.includes(o.value))
          .reduce((acc, o) => acc + o.count, 0);

  const buttonLabel =
    selected.length === 0
      ? `Todas · ${total}`
      : `${options
          .filter((o) => selected.includes(o.value))
          .map((o) => o.label)
          .join(", ")} · ${visibleCount}`;

  return (
    <div ref={rootRef} className="relative z-30 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          id="filtro-estado-filas-label"
          className="text-xs font-semibold uppercase tracking-wider text-periwinkle-500"
        >
          Estado
        </span>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby="filtro-estado-filas-label filtro-estado-filas-button"
          id="filtro-estado-filas-button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 max-w-full items-center gap-2 rounded-md border border-periwinkle-300 bg-white px-3 py-1.5 text-sm font-medium text-periwinkle-900 outline-none transition-colors hover:bg-periwinkle-50 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30"
        >
          <span className="truncate">{buttonLabel}</span>
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => router.push(baseHref)}
            className="text-xs font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
          >
            Limpiar
          </button>
        )}
      </div>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby="filtro-estado-filas-label"
          className="absolute z-50 mt-1 w-64 rounded-md border border-periwinkle-200 bg-white py-1 shadow-lg"
        >
          <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-periwinkle-50">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => router.push(baseHref)}
              className="h-4 w-4 accent-[#352574]"
            />
            <span className="font-medium">Todas · {total}</span>
          </label>
          <div className="border-t border-periwinkle-100" aria-hidden />
          {options.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-periwinkle-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.value)}
                  className="h-4 w-4 accent-[#352574]"
                />
                <span className="flex-1">
                  {o.label} · {o.count}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
