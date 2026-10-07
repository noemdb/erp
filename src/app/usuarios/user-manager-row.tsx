"use client";

import { useState } from "react";
import Close from "@mui/icons-material/Close";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import {
  setMembershipAction,
  removeMembershipAction,
  setUserStatusAction,
} from "@/modules/identity/users-actions";

export type RowUser = {
  id: string;
  name: string | null;
  email: string;
  status: string;
  companies: { companyId: string; razonSocial: string; role: string }[];
};

const rolEs: Record<string, { label: string; variant: "default" | "success" | "secondary" | "outline" }> = {
  admin: { label: "Admin", variant: "default" },
  administrativo: { label: "Administrativo", variant: "secondary" },
  contador: { label: "Contador", variant: "success" },
  auditor: { label: "Auditor", variant: "outline" },
};

const roleOptions = ["administrativo", "contador", "auditor", "admin"] as const;

function initials(name: string | null, email: string): string {
  const base = (name ?? "").trim() || email;
  const parts = base.split(/[\s@._-]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

const selectClassName =
  "h-8 rounded-md border border-periwinkle-300 bg-white px-2 text-xs text-periwinkle-900 outline-none transition-colors focus-visible:border-[#37c8a1] disabled:cursor-not-allowed disabled:opacity-50";

export function UserManagerRow({
  user,
  allCompanies,
  isSelf,
}: {
  user: RowUser;
  allCompanies: { id: string; razonSocial: string }[];
  isSelf: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [addCompany, setAddCompany] = useState("");
  const [addRole, setAddRole] = useState<(typeof roleOptions)[number]>("administrativo");
  const suspended = user.status !== "active";

  async function run<T extends { ok: boolean; error?: { code: string; message: string } }>(
    p: Promise<T>,
  ): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await p;
      if (!res.ok) {
        setMsg(`${res.error?.code ?? "ERROR"}: ${res.error?.message ?? "Falló la operación."}`);
        setBusy(false);
        return false;
      }
      setBusy(false);
      return true;
    } catch {
      setMsg("Error de red. Intenta de nuevo.");
      setBusy(false);
      return false;
    }
  }

  const missing = allCompanies.filter((c) => !user.companies.some((m) => m.companyId === c.id));

  return (
    <>
      <tr
        className={
          suspended
            ? "border-b border-periwinkle-100 bg-periwinkle-50/50 opacity-70 transition-colors last:border-0"
            : "border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
        }
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 text-xs">
              <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name ?? "—"}</p>
              <p className="truncate font-mono text-xs text-periwinkle-500">{user.email}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant={suspended ? "muted" : "success"}>
                  {suspended ? "Suspendido" : "Activo"}
                </Badge>
                {!isSelf && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(setUserStatusAction({ userId: user.id, status: suspended ? "active" : "suspended" }))
                    }
                    className="rounded-md px-1.5 py-0.5 text-xs font-medium text-periwinkle-500 underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27] disabled:opacity-50"
                  >
                    {suspended ? "Reactivar" : "Suspender"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {user.companies.length === 0 ? (
            <span className="text-xs text-periwinkle-400">Sin accesos</span>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {user.companies.map((c) => {
                return (
                  <li
                    key={`${c.companyId}-${c.role}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-periwinkle-200 bg-white px-2 py-1 text-xs"
                    title={c.companyId}
                  >
                    <span className="max-w-44 truncate font-medium">{c.razonSocial}</span>
                    <select
                      aria-label={`Rol de ${user.email} en ${c.razonSocial}`}
                      value={roleOptions.includes(c.role as (typeof roleOptions)[number]) ? c.role : "administrativo"}
                      disabled={busy}
                      onChange={(e) =>
                        run(setMembershipAction({ userId: user.id, companyId: c.companyId, role: e.target.value as (typeof roleOptions)[number] }))
                      }
                      className={selectClassName}
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {rolEs[r]!.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Quitar acceso a ${c.razonSocial}`}
                      title="Quitar acceso"
                      disabled={busy}
                      onClick={() => run(removeMembershipAction({ userId: user.id, companyId: c.companyId }))}
                      className="flex rounded p-0.5 text-periwinkle-400 transition-colors hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                    >
                      <Close className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {missing.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <select
                aria-label={`Agregar empresa a ${user.email}`}
                value={addCompany}
                disabled={busy}
                onChange={(e) => setAddCompany(e.target.value)}
                className={selectClassName}
              >
                <option value="">+ Agregar empresa…</option>
                {missing.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial}
                  </option>
                ))}
              </select>
              {addCompany && (
                <>
                  <select
                    aria-label="Rol en la nueva empresa"
                    value={addRole}
                    disabled={busy}
                    onChange={(e) => setAddRole(e.target.value as typeof addRole)}
                    className={selectClassName}
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {rolEs[r]!.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await run(setMembershipAction({ userId: user.id, companyId: addCompany, role: addRole }));
                      if (ok) setAddCompany("");
                    }}
                  >
                    {busy ? <Spinner size={12} label="Guardando acceso" /> : "Dar acceso"}
                  </Button>
                </>
              )}
            </div>
          )}
          {msg && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-red-800">
              <WarningAmber className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {msg}
            </p>
          )}
        </td>
      </tr>
    </>
  );
}
