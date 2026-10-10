"use client";

import { useRef, useState } from "react";
import Close from "@mui/icons-material/Close";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import {
  setMembershipAction,
  removeMembershipAction,
} from "@/modules/identity/users-actions";

export type AccessCompany = { companyId: string; razonSocial: string; role: string; logoUrl?: string | null; colorDistintivo?: string | null };

const roleOptions = ["administrativo", "contador", "auditor", "admin"] as const;
export type RoleOption = (typeof roleOptions)[number];

const roleMeta: Record<RoleOption, { label: string; variant: "default" | "success" | "secondary" | "outline"; cap: string }> = {
  administrativo: { label: "Administrativo", variant: "secondary", cap: "registra y prepara" },
  contador: { label: "Contador", variant: "success", cap: "valida, emite y cierra" },
  auditor: { label: "Auditor", variant: "outline", cap: "solo lectura" },
  admin: { label: "Admin", variant: "default", cap: "gestiona empresa y usuarios" },
};

const selectClassName =
  "h-8 rounded-md border border-periwinkle-300 bg-white px-2 text-xs text-periwinkle-900 outline-none transition-colors focus-visible:border-[#37c8a1] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Diálogo de gestión de accesos: un tab por rol con las empresas en ese rol.
 * `readOnly` muestra el mismo contenido sin controles de mutación (botón Ver).
 * Tabs propios con ARIA (tablist/tab/tabpanel + flechas), sin MUI Tabs:
 * el repo no importa `@mui/material` directo en `src` (precedente ADR-028).
 */
export function AccessDialog({
  userId,
  userName,
  userEmail,
  companies,
  allCompanies,
  isSelf,
  readOnly,
  onClose,
}: {
  userId: string;
  userName: string | null;
  userEmail: string;
  companies: AccessCompany[];
  allCompanies: { id: string; razonSocial: string }[];
  isSelf: boolean;
  readOnly: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<RoleOption>("administrativo");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [addCompany, setAddCompany] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  async function run<T extends { ok: boolean; error?: { code: string; message: string } }>(
    key: string,
    p: Promise<T>,
    success: { title: string; description?: string },
  ): Promise<boolean> {
    setBusyKey(key);
    setMsg(null);
    try {
      const res = await p;
      if (!res.ok) {
        setMsg(`${res.error?.code ?? "ERROR"}: ${res.error?.message ?? "Falló la operación."}`);
        setBusyKey(null);
        return false;
      }
      toast({ title: success.title, description: success.description, variant: "success" });
      setBusyKey(null);
      setConfirmKey(null);
      return true;
    } catch {
      setMsg("Error de red. Intenta de nuevo.");
      setBusyKey(null);
      return false;
    }
  }

  const byRole = (r: string) => companies.filter((c) => c.role === r);
  const unknown = companies.filter((c) => !(roleOptions as readonly string[]).includes(c.role));
  const withoutAccess = allCompanies.filter((c) => !companies.some((m) => m.companyId === c.id));
  const busy = busyKey !== null;

  function onTabKey(e: React.KeyboardEvent, ix: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (ix + 1) % roleOptions.length;
    else if (e.key === "ArrowLeft") next = (ix - 1 + roleOptions.length) % roleOptions.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = roleOptions.length - 1;
    if (next !== null) {
      e.preventDefault();
      setTab(roleOptions[next]!);
      tabRefs.current[next]?.focus();
    }
  }

  return (
    <Modal open onClose={onClose} wide label={readOnly ? `Accesos de ${userEmail}` : `Gestionar accesos de ${userEmail}`}>
      <h2 className="text-base font-semibold tracking-tight">
        {readOnly ? "Accesos" : "Gestionar accesos"} — {userName ?? userEmail}
      </h2>
      <p className="mt-1 font-mono text-xs text-periwinkle-500">{userEmail}</p>
      {isSelf && !readOnly && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Es tu propio acceso: quitar tu última empresa administrada te saca de esta página.
        </p>
      )}

      <div role="tablist" aria-label="Roles" className="mt-4 flex flex-wrap gap-1.5 border-b border-periwinkle-200">
        {roleOptions.map((r, ix) => {
          const selected = tab === r;
          const n = byRole(r).length;
          return (
            <button
              key={r}
              ref={(el) => {
                tabRefs.current[ix] = el;
              }}
              type="button"
              role="tab"
              id={`rol-tab-${r}`}
              aria-selected={selected}
              aria-controls={`rol-panel-${r}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                setTab(r);
                setAddCompany("");
                setConfirmKey(null);
              }}
              onKeyDown={(e) => onTabKey(e, ix)}
              className={
                selected
                  ? "rounded-t-md border border-b-0 border-periwinkle-300 bg-white px-3 py-2 text-xs font-semibold text-[#120c27]"
                  : "rounded-t-md border border-b-0 border-transparent px-3 py-2 text-xs font-medium text-periwinkle-500 transition-colors hover:bg-periwinkle-50 hover:text-[#120c27]"
              }
            >
              {roleMeta[r].label}
              <span className="ml-1.5 rounded-full bg-periwinkle-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-periwinkle-700">
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {roleOptions.map((r) =>
        tab === r ? (
          <div key={r} role="tabpanel" id={`rol-panel-${r}`} aria-labelledby={`rol-tab-${r}`} className="border border-t-0 border-periwinkle-200 bg-white p-4">
            <p className="text-xs text-periwinkle-500">
              <Badge variant={roleMeta[r].variant}>{roleMeta[r].label}</Badge>{" "}
              <span className="ml-1">{roleMeta[r].cap}.</span>
            </p>
            {byRole(r).length === 0 ? (
              <p className="mt-3 text-xs text-periwinkle-400">Sin empresas con este rol.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {byRole(r).map((c) => {
                  const ck = `q-${c.companyId}`;
                  return (
                    <li
                      key={c.companyId}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-periwinkle-200 bg-white px-3 py-2 text-sm"
                      title={c.companyId}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{c.razonSocial}</span>
                      {!readOnly && (
                        <>
                          <label className="flex items-center gap-1.5 text-xs text-periwinkle-500">
                            Mover a
                            <select
                              aria-label={`Mover ${c.razonSocial} a otro rol`}
                              value={r}
                              disabled={busy}
                              onChange={(e) =>
                                run(
                                  `m-${c.companyId}`,
                                  setMembershipAction({ userId, companyId: c.companyId, role: e.target.value as RoleOption }),
                                  { title: "Rol actualizado", description: `${roleMeta[e.target.value as RoleOption].label} en ${c.razonSocial}` },
                                )
                              }
                              className={selectClassName}
                            >
                              {roleOptions.map((o) => (
                                <option key={o} value={o}>
                                  {roleMeta[o].label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {busyKey === `m-${c.companyId}` ? (
                            <Spinner size={12} label="Guardando rol" />
                          ) : confirmKey === ck ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className="font-medium text-red-800">¿Quitar?</span>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  run(`rev-${c.companyId}`, removeMembershipAction({ userId, companyId: c.companyId }), {
                                    title: "Acceso retirado",
                                    description: `${userEmail} · ${c.razonSocial}`,
                                  })
                                }
                                className="h-7 border-red-300 px-2 text-red-800 hover:bg-red-50"
                              >
                                {busyKey === `rev-${c.companyId}` ? <Spinner size={12} label="Quitando acceso" /> : "Sí"}
                              </Button>
                              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmKey(null)} className="h-7 px-2">
                                No
                              </Button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Quitar acceso a ${c.razonSocial}`}
                              title="Quitar acceso"
                              disabled={busy}
                              onClick={() => setConfirmKey(ck)}
                              className="flex rounded p-1 text-periwinkle-400 transition-colors hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                            >
                              <Close className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!readOnly && withoutAccess.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-periwinkle-100 pt-3">
                <select
                  aria-label={`Agregar empresa con rol ${roleMeta[r].label}`}
                  value={addCompany}
                  disabled={busy}
                  onChange={(e) => setAddCompany(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">+ Agregar empresa…</option>
                  {withoutAccess.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial}
                    </option>
                  ))}
                </select>
                {addCompany && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={async () => {
                      const company = withoutAccess.find((c) => c.id === addCompany);
                      const ok = await run(
                        "add",
                        setMembershipAction({ userId, companyId: addCompany, role: r }),
                        { title: "Acceso otorgado", description: `${roleMeta[r].label} en ${company?.razonSocial ?? ""}` },
                      );
                      if (ok) setAddCompany("");
                    }}
                  >
                    {busyKey === "add" ? <Spinner size={12} label="Guardando acceso" /> : `Dar acceso como ${roleMeta[r].label}`}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : null,
      )}

      {unknown.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-900">
          <WarningAmber className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Roles no reconocidos (requieren revisión): {unknown.map((c) => `${c.razonSocial} (${c.role})`).join(", ")}.
        </p>
      )}
      {msg && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-xs text-red-800">
          <WarningAmber className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {msg}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
