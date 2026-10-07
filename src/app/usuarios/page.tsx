import Link from "next/link";
import { redirect } from "next/navigation";
import AdminPanelSettings from "@mui/icons-material/AdminPanelSettings";
import VpnKey from "@mui/icons-material/VpnKey";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { listUsersForAdmin } from "@/modules/identity/recovery";
import { listUserCompanies } from "@/modules/tenancy/repo";
import { ResetForm } from "./reset-form";
import { NewUserDialog } from "./new-user-dialog";
import { UserManagerRow } from "./user-manager-row";

export default async function UsuariosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const mems = await listMemberships(user.id);
  let ok = false;
  for (const m of mems) {
    if ((await authorize(m.companyId, user.id, "users.manage")).ok) {
      ok = true;
      break;
    }
  }
  if (!ok) redirect("/dashboard");
  const users = await listUsersForAdmin();
  const totalMembresias = users.reduce((a, u) => a + u.companies.length, 0);
  // Empresas donde este admin gestiona usuarios (únicas ofrecidas en altas y accesos).
  const managedIds = new Set<string>();
  for (const m of mems) {
    if ((await authorize(m.companyId, user.id, "users.manage")).ok) managedIds.add(m.companyId);
  }
  const manageableCompanies = (await listUserCompanies(user.id))
    .filter((c) => managedIds.has(c.id))
    .map((c) => ({ id: c.id, razonSocial: c.razonSocial }));

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title="Usuarios"
        back={{ href: "/dashboard", label: "Dashboard" }}
        user={user}
        companyCount={mems.length}
      />

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden pt-10">
          <div
            className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/10 via-[#352574]/5 to-transparent blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Administración
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Usuarios
            </h1>
            <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
              Cuentas del sistema, sus empresas y roles. Solo administradores.
            </p>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Totales">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Usuarios", value: String(users.length) },
              { label: "Membresías empresa·rol", value: String(totalMembresias) },
            ].map((k, i) => (
              <Reveal key={k.label} delay={i * 80} className="h-full">
                <Card className="h-full rounded-lg">
                  <CardContent className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
                      {k.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
                      {k.value}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Tabla */}
        <section className="mt-8" aria-label="Lista de usuarios">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base tracking-tight">
                      Cuentas registradas
                    </CardTitle>
                    <CardDescription>
                      {users.length === 0
                        ? "No hay usuarios registrados."
                        : `${users.length} ${users.length === 1 ? "cuenta" : "cuentas"} con sus accesos por empresa.`}
                    </CardDescription>
                  </div>
                  {manageableCompanies.length > 0 && (
                    <NewUserDialog companies={manageableCompanies} />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-sm">
                    <thead>
                      <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                        <th scope="col" className="px-4 py-3">Usuario</th>
                        <th scope="col" className="px-4 py-3">Empresas y roles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <UserManagerRow
                          key={u.id}
                          user={{
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            status: u.status,
                            companies: u.companies,
                          }}
                          allCompanies={manageableCompanies}
                          isSelf={u.id === user.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Restablecimiento */}
        <section className="mt-8" aria-label="Restablecer acceso">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]" aria-hidden />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                    <VpnKey className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="text-base tracking-tight">
                      Generar enlace de restablecimiento
                    </CardTitle>
                    <CardDescription>
                      Un solo uso. Entrégalo por un canal externo, nunca por el mismo correo.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResetForm />
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8 flex items-center gap-2 text-sm text-periwinkle-500">
          <AdminPanelSettings className="h-4 w-4" aria-hidden />
          <p>
            Solo quien administra usuarios ve esta página.{" "}
            <Link href="/dashboard" className="underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]">
              Volver al dashboard
            </Link>
          </p>
        </div>
      </main>

      <PageFooter />
    </div>
  );
}
