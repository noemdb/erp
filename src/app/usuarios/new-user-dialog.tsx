"use client";

import { useState } from "react";
import Add from "@mui/icons-material/Add";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/progress";
import { createUserAction } from "@/modules/identity/users-actions";

const inputClassName =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";

const roles = [
  { value: "administrativo", label: "Administrativo — registra y prepara" },
  { value: "contador", label: "Contador — valida, emite y cierra" },
  { value: "auditor", label: "Auditor — solo lectura" },
  { value: "admin", label: "Admin — gestiona empresa y usuarios" },
] as const;

export function NewUserDialog({ companies }: { companies: { id: string; razonSocial: string }[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [role, setRole] = useState<(typeof roles)[number]["value"]>("administrativo");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await createUserAction({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        companyId,
        role,
      });
      if (!res.ok) {
        setMsg(`${res.error.code}: ${res.error.message}`);
        setBusy(false);
      } else {
        setOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        setMsg(null);
        setBusy(false);
      }
    } catch {
      setMsg("Error de red. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Add aria-hidden />
        Nuevo usuario
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} label="Crear usuario">
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Nuevo usuario</h2>
            <p className="mt-1 text-sm text-periwinkle-500">
              Crea la cuenta y su primer acceso empresa·rol. Podrás agregar más accesos después.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="nu-name" className="text-sm font-medium text-periwinkle-700">
              Nombre
            </label>
            <input
              id="nu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre Apellido"
              required
              disabled={busy}
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="nu-email" className="text-sm font-medium text-periwinkle-700">
              Correo
            </label>
            <input
              id="nu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              required
              disabled={busy}
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="nu-pass" className="text-sm font-medium text-periwinkle-700">
              Contraseña inicial <span className="font-normal text-periwinkle-400">(mínimo 10 caracteres)</span>
            </label>
            <input
              id="nu-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              required
              disabled={busy}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="nu-company" className="text-sm font-medium text-periwinkle-700">
                Empresa
              </label>
              <select
                id="nu-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={busy}
                required
                className={inputClassName}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="nu-role" className="text-sm font-medium text-periwinkle-700">
                Rol
              </label>
              <select
                id="nu-role"
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                disabled={busy}
                className={inputClassName}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Spinner label="Creando usuario" />
                  Creando…
                </>
              ) : (
                "Crear usuario"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
