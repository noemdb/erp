"use client";

import { useState } from "react";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { updateUserAction } from "@/modules/identity/users-actions";

const inputClassName =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";

/** Edita nombre/correo/clave de un usuario. La clave es opcional; si se cambia, revoca sus sesiones. */
export function EditUserDialog({
  userId,
  currentName,
  currentEmail,
  userEmail,
  isSelf,
  onClose,
}: {
  userId: string;
  currentName: string | null;
  currentEmail: string;
  userEmail: string;
  isSelf: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(currentName ?? "");
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password && password !== confirm) {
      setMsg("VALIDATION_ERROR: La clave y su confirmación no coinciden.");
      return;
    }
    const patch: { name?: string; email?: string; password?: string } = {};
    const n = name.trim();
    const m = email.trim().toLowerCase();
    if (n && n !== (currentName ?? "")) patch.name = n;
    if (m && m !== currentEmail) patch.email = m;
    if (password) patch.password = password;
    if (Object.keys(patch).length === 0) {
      setMsg("Sin cambios: modifica algún campo.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await updateUserAction({ userId, ...patch });
      if (!res.ok) {
        setMsg(`${res.error.code}: ${res.error.message}`);
        setBusy(false);
      } else {
        toast({
          title: "Usuario actualizado",
          description: "passwordChanged" in res && res.passwordChanged ? "Sesiones del usuario revocadas." : userEmail,
          variant: "success",
        });
        setBusy(false);
        onClose();
      }
    } catch {
      setMsg("Error de red. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} label={`Editar ${userEmail}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Editar usuario</h2>
          <p className="mt-1 font-mono text-xs text-periwinkle-500">{userEmail}</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="eu-name" className="text-sm font-medium text-periwinkle-700">
            Nombre
          </label>
          <input
            id="eu-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre Apellido"
            disabled={busy}
            autoComplete="name"
            className={inputClassName}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="eu-email" className="text-sm font-medium text-periwinkle-700">
            Correo
          </label>
          <input
            id="eu-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@empresa.com"
            required
            disabled={busy}
            autoComplete="email"
            className={inputClassName}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="eu-pass" className="text-sm font-medium text-periwinkle-700">
              Nueva clave <span className="font-normal text-periwinkle-400">(opcional)</span>
            </label>
            <input
              id="eu-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Solo si cambia"
              disabled={busy}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="eu-confirm" className="text-sm font-medium text-periwinkle-700">
              Confirmar clave
            </label>
            <input
              id="eu-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la clave"
              disabled={busy}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>
        </div>
        <p className="text-xs text-periwinkle-500">
          Cambiar la clave revoca las sesiones del usuario{isSelf ? " (incluida la tuya: tendrás que reingresar)" : ""}.
        </p>
        {msg && (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {msg}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <>
                <Spinner label="Guardando cambios" />
                Guardando…
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
