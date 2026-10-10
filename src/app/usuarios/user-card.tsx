"use client";

import { useState } from "react";
import Edit from "@mui/icons-material/Edit";
import ManageAccounts from "@mui/icons-material/ManageAccounts";
import Visibility from "@mui/icons-material/Visibility";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { setUserStatusAction } from "@/modules/identity/users-actions";
import { AccessDialog, type AccessCompany, type RoleOption } from "./access-dialog";
import { EditUserDialog } from "./edit-user-dialog";

export type CardUser = {
  id: string;
  name: string | null;
  email: string;
  status: string;
  companies: AccessCompany[];
};

const roleVariant: Record<RoleOption, "default" | "success" | "secondary" | "outline"> = {
  admin: "default",
  administrativo: "secondary",
  contador: "success",
  auditor: "outline",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  administrativo: "Administrativo",
  contador: "Contador",
  auditor: "Auditor",
};

function initials(name: string | null, email: string): string {
  const base = (name ?? "").trim() || email;
  const parts = base.split(/[\s@._-]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

function companyInitials(razonSocial: string): string {
  const parts = razonSocial.trim().split(/[\s,._-]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "E";
}

/** Solo hex `#rrggbb`: el valor viene de texto libre en DB y va a CSS inline. */
function safeBrandColor(raw: string | null | undefined): string | null {
  return raw && /^#[0-9a-fA-F]{6}$/.test(raw.trim()) ? raw.trim() : null;
}

/** Solo http(s): el logo va a `<img src>` y no debe aceptar `javascript:`. */
function safeLogoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function UserCard({
  user,
  allCompanies,
  isSelf,
}: {
  user: CardUser;
  allCompanies: { id: string; razonSocial: string }[];
  isSelf: boolean;
}) {
  const toast = useToast();
  const [dialog, setDialog] = useState<"manage" | "view" | "edit" | null>(null);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [busy, setBusy] = useState(false);
  const suspended = user.status !== "active";

  const counts = new Map<string, number>();
  for (const c of user.companies) counts.set(c.role, (counts.get(c.role) ?? 0) + 1);

  async function toggleStatus() {
    setConfirmStatus(false);
    setBusy(true);
    try {
      const res = await setUserStatusAction({ userId: user.id, status: suspended ? "active" : "suspended" });
      if (!res.ok) {
        toast({ title: `${res.error?.code ?? "ERROR"}: ${res.error?.message ?? "Falló la operación."}`, variant: "error" });
      } else {
        toast({ title: suspended ? "Usuario reactivado" : "Usuario suspendido", description: user.email, variant: "success" });
      }
    } catch {
      toast({ title: "Error de red. Intenta de nuevo.", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className={suspended ? "opacity-70" : undefined}>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 text-sm">
              <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{user.name ?? "—"}</p>
              <p className="truncate font-mono text-xs text-periwinkle-500">{user.email}</p>
            </div>
            <Badge variant={suspended ? "muted" : "success"}>{suspended ? "Suspendido" : "Activo"}</Badge>
          </div>

          <div aria-label={`Accesos de ${user.email}`} className="space-y-2">
            {user.companies.length === 0 ? (
              <span className="text-xs text-periwinkle-400">Sin accesos</span>
            ) : (
              <>
                <ul className="flex flex-wrap gap-1.5">
                  {[...counts.entries()].map(([role, n]) => (
                    <li key={role}>
                      <Badge variant={roleVariant[role as RoleOption] ?? "outline"} title={`${n} ${n === 1 ? "empresa" : "empresas"}`}>
                        {roleLabel[role] ?? role} · {n}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <ul aria-label={`Empresas de ${user.email}`} className="flex flex-wrap gap-1.5">
                  {user.companies.map((c) => {
                    const logo = safeLogoUrl(c.logoUrl);
                    const top = safeBrandColor(c.colorDistintivo) ?? "#37c8a1";
                    return (
                      <li key={c.companyId}>
                        <button
                          type="button"
                          onClick={() => setDialog("manage")}
                          title={`${c.razonSocial} · ${roleLabel[c.role] ?? c.role}`}
                          aria-label={`Gestionar acceso a ${c.razonSocial}`}
                          style={{ borderTopColor: top }}
                          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-t-2 border-periwinkle-200 bg-periwinkle-100 text-[10px] font-semibold text-[#352574] transition-colors hover:border-[#37c8a1] hover:bg-icy-aqua-100 hover:text-icy-aqua-800"
                        >
                          {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logo} alt="" aria-hidden className="h-full w-full object-cover" />
                          ) : (
                            companyInitials(c.razonSocial)
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-periwinkle-100 pt-3">
            <Button size="sm" variant="secondary" onClick={() => setDialog("manage")} disabled={busy}>
              <ManageAccounts aria-hidden />
              Gestionar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialog("edit")} disabled={busy}>
              <Edit aria-hidden />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialog("view")} disabled={busy}>
              <Visibility aria-hidden />
              Ver
            </Button>
            {!isSelf && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmStatus(true)} disabled={busy} className="text-red-800 hover:bg-red-50 hover:text-red-800">
                {suspended ? "Reactivar" : "Suspender"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {dialog !== null && dialog !== "edit" && (
        <AccessDialog
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
          companies={user.companies}
          allCompanies={allCompanies}
          isSelf={isSelf}
          readOnly={dialog === "view"}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "edit" && (
        <EditUserDialog
          userId={user.id}
          currentName={user.name}
          currentEmail={user.email}
          userEmail={user.email}
          isSelf={isSelf}
          onClose={() => setDialog(null)}
        />
      )}
      <Modal
        open={confirmStatus}
        onClose={() => setConfirmStatus(false)}
        label={suspended ? `Reactivar a ${user.email}` : `Suspender a ${user.email}`}
      >
        <h2 className="text-base font-semibold tracking-tight">
          {suspended ? "Reactivar usuario" : "Suspender usuario"}
        </h2>
        <p className="mt-2 text-sm text-periwinkle-700">
          {suspended ? (
            <>
              <span className="font-medium">{user.email}</span> podrá ingresar de nuevo con sus
              accesos actuales.
            </>
          ) : (
            <>
              <span className="font-medium">{user.email}</span> no podrá ingresar hasta reactivarlo.
              Sus empresas, roles y la auditoría se conservan.
            </>
          )}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmStatus(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={toggleStatus}
            className={suspended ? undefined : "border-red-300 text-red-800 hover:bg-red-50"}
          >
            {busy ? (
              <>
                <Spinner size={12} label="Cambiando estado" />
                {suspended ? "Reactivando…" : "Suspendiendo…"}
              </>
            ) : suspended ? (
              "Reactivar"
            ) : (
              "Suspender"
            )}
          </Button>
        </div>
      </Modal>
    </>
  );
}
