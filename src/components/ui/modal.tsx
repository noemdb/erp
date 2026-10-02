"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Modal accesible estilo shadcn (esquinas cuadradas).
 * Overlay + Escape para cerrar, `role="dialog"` + `aria-modal`.
 */
export function Modal({
  open,
  onClose,
  label,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Duplica el ancho (formularios amplios como empresas). */
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;
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

  if (!open) return null;
  // Portal al body: evita que ancestros con overflow-hidden o transform
  // (como las tarjetas) recorten o circunscriban el diálogo.
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#120c27]/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={
          wide
            ? "animate-fade-up relative max-h-[90vh] w-full max-w-[64rem] overflow-y-auto rounded-md border border-periwinkle-200 bg-white shadow-2xl"
            : "animate-fade-up relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-periwinkle-200 bg-white shadow-2xl"
        }
      >
        <div
          className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
          aria-hidden
        />
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
