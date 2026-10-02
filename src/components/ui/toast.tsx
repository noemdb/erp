"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Close from "@mui/icons-material/Close";
import Info from "@mui/icons-material/Info";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type Toast = ToastInput & { id: number; variant: ToastVariant };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: WarningAmber,
  info: Info,
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: "text-icy-aqua-700",
  error: "text-red-800",
  info: "text-[#352574]",
};

const BAR_COLOR: Record<ToastVariant, string> = {
  success: "bg-icy-aqua-600",
  error: "bg-red-600",
  info: "bg-[#352574]",
};

/** Proveedor global: montar una vez en el layout raíz. */
export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  // Solo portal tras hidratar: en SSR devuelve false (igual que el HTML).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) =>
        [...prev, { ...input, id, variant: input.variant ?? "info" }].slice(-4)
      );
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 4500)
      );
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed bottom-4 right-4 z-[110] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
          >
            {toasts.map((t) => {
              const Icon = ICONS[t.variant];
              return (
                <div
                  key={t.id}
                  role={t.variant === "error" ? "alert" : "status"}
                  className="toast-in pointer-events-auto flex items-start gap-2.5 overflow-hidden rounded-md border border-periwinkle-200 bg-white shadow-xl shadow-periwinkle-200/60"
                >
                  <span
                    className={cn("w-1 shrink-0 self-stretch", BAR_COLOR[t.variant])}
                    aria-hidden
                  />
                  <Icon
                    className={cn("mt-3 h-4 w-4 shrink-0", ICON_COLOR[t.variant])}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 py-2.5">
                    <p className="text-sm font-semibold text-periwinkle-900">
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="mt-0.5 truncate text-xs text-periwinkle-500">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Cerrar notificación"
                    className="m-1.5 rounded-md p-1 text-periwinkle-400 transition-colors hover:bg-periwinkle-100 hover:text-periwinkle-700"
                  >
                    <Close className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
