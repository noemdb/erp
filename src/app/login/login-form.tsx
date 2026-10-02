"use client";

import { useState } from "react";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Lock from "@mui/icons-material/Lock";
import Email from "@mui/icons-material/Email";
import WarningAmber from "@mui/icons-material/WarningAmber";
import CircularProgress from "@mui/material/CircularProgress";
import { Button } from "@/components/ui/button";
import { login } from "@/modules/identity/actions";

const inputClassName =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const res = await login({
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
        });
        if (!res.ok) {
          setError(res.error);
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-periwinkle-700">
          Correo
        </label>
        <div className="relative">
          <Email
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-periwinkle-400"
            aria-hidden
          />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="usuario@empresa.com"
            disabled={busy}
            className={`${inputClassName} pl-9 pr-3`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-periwinkle-700">
          Contraseña
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-periwinkle-400"
            aria-hidden
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={busy}
            className={`${inputClassName} pl-9 pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={busy}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-periwinkle-400 transition-colors hover:bg-periwinkle-100 hover:text-periwinkle-600 disabled:opacity-50"
          >
            {showPassword ? (
              <VisibilityOff className="h-4 w-4" aria-hidden />
            ) : (
              <Visibility className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full rounded-md">
        {busy ? (
          <>
            <CircularProgress size={16} color="inherit" aria-hidden />
            Verificando…
          </>
        ) : (
          <>
            Entrar <ArrowForward aria-hidden />
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-periwinkle-400">
        <Lock className="h-3 w-3" aria-hidden />
        Sesiones revocables · límite 5 intentos por minuto
      </p>
    </form>
  );
}
