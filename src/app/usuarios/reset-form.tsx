"use client";

import { useState } from "react";
import ContentCopy from "@mui/icons-material/ContentCopy";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { issueResetLinkAction } from "@/modules/identity/recovery-actions";

const inputClassName =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";

export function ResetForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setLink(null);
    setCopied(false);
    try {
      const res = await issueResetLinkAction(email.trim().toLowerCase());
      if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
      else setLink(res.link);
    } catch {
      setMsg("Error de red. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setMsg("No se pudo copiar. Selecciónalo a mano.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="reset-email" className="sr-only">
          Correo del usuario
        </label>
        <input
          id="reset-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@empresa.com"
          type="email"
          required
          disabled={busy}
          className={inputClassName}
        />
        <Button type="submit" disabled={busy} className="shrink-0">
          {busy ? (
            <>
              <Spinner label="Generando enlace" />
              Generando…
            </>
          ) : (
            "Generar enlace"
          )}
        </Button>
      </div>
      {msg && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {msg}
        </p>
      )}
      {link && (
        <div className="space-y-1.5 rounded-md border border-icy-aqua-600/30 bg-icy-aqua-50 px-3 py-2.5">
          <p className="text-xs font-medium text-icy-aqua-700" role="status">
            Enlace de un solo uso — cópialo ahora, no se vuelve a mostrar.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              aria-label="Enlace de restablecimiento"
              className={`${inputClassName} font-mono text-xs`}
            />
            <Button type="button" variant="secondary" onClick={copy} className="shrink-0">
              <ContentCopy aria-hidden />
              {copied ? "¡Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
