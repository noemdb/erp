"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/progress";

/**
 * Indicador global de carga para todas las páginas.
 * Abajo a la derecha, con la palabra "Cargando…".
 * Se muestra al navegar entre rutas y se oculta al completarse
 * (la ruta actual iguala al destino). El retardo anti-parpadeo es CSS
 * (`.loader-delayed`), sin temporizadores de estado.
 */
function LoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [target, setTarget] = useState<string | null>(null);

  const query = searchParams.toString();
  const current = query ? `${pathname}?${query}` : pathname;
  const pending = target !== null && target !== current;

  // Clic en enlace interno → destino esperado.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href^="/"]');
      const href = anchor?.getAttribute("href");
      if (href) setTarget(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Seguridad: si la navegación falla, soltar tras 8 s.
  useEffect(() => {
    if (!target) return undefined;
    const t = setTimeout(() => setTarget(null), 8000);
    return () => clearTimeout(t);
  }, [target]);

  if (!pending) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="loader-delayed fixed bottom-24 right-6 z-[100] flex items-center gap-2 rounded-md border border-periwinkle-200 bg-white px-3.5 py-2.5 text-sm text-periwinkle-700 shadow-xl shadow-periwinkle-200/60"
    >
      <Spinner label="Cargando página" />
      Cargando…
    </div>
  );
}

export function GlobalLoading() {
  return (
    <Suspense fallback={null}>
      <LoaderInner />
    </Suspense>
  );
}
