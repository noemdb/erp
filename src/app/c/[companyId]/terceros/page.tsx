import Link from "next/link";
import { redirect } from "next/navigation";
import Add from "@mui/icons-material/Add";
import Business from "@mui/icons-material/Business";
import Clear from "@mui/icons-material/Clear";
import Search from "@mui/icons-material/Search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listParties } from "@/modules/parties/service";

export default async function TercerosPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { companyId } = await params;
  const { q } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const all = await listParties({ companyId, userId: user.id });
  const query = (q ?? "").trim().toLowerCase();
  const rows = query === ""
    ? [...all].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, "es"))
    : all
      .filter((r) =>
        r.rifOriginal.toLowerCase().includes(query) ||
        r.rif.toLowerCase().includes(query) ||
        r.razonSocial.toLowerCase().includes(query),
      )
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, "es"));

  const activos = all.filter((r) => r.status === "active").length;

  const kpis = [
    { label: "Terceros", value: String(all.length), mono: true },
    { label: "Activos", value: String(activos), mono: true },
    { label: "Inactivos", value: String(all.length - activos), mono: true },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Terceros · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: base, label: "Panel" }}
        user={user}
        role={ctx.role}
        companyCount={memberships.length}
        branding={{
          color: ctx.company?.colorDistintivo ?? null,
          logoUrl: ctx.company?.logoUrl ?? null,
        }}
      />

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden pt-10">
          <div
            className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/10 via-[#352574]/5 to-transparent blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="rounded-md px-3 py-1">
                Datos base · Terceros
              </Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Terceros
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Clientes y proveedores con RIF dual y perfil fiscal con
                vigencia. El rol lo determina la operación, no el maestro; un
                inactivo no admite documentos nuevos.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <Link href={`${base}/terceros/nuevo`}>
                  <Add aria-hidden />
                  Nuevo tercero
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Totales de terceros">
          <div className="grid gap-4 sm:grid-cols-3">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 3) * 80} className="h-full">
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
        <section className="mt-8" aria-label="Lista de terceros">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base tracking-tight">
                      Maestro de terceros
                    </CardTitle>
                    <CardDescription>
                      {rows.length === 0 && query !== ""
                        ? `Sin coincidencias para “${q?.trim()}”.`
                        : rows.length === 0
                          ? "Aún no hay terceros registrados en esta empresa."
                          : `${rows.length} ${rows.length === 1 ? "tercero" : "terceros"} en orden alfabético.`}
                    </CardDescription>
                  </div>
                  <form action={base + "/terceros"} method="get" role="search" className="flex w-full gap-2 sm:w-72">
                    <label htmlFor="q" className="sr-only">Buscar por RIF o razón social</label>
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-periwinkle-400" aria-hidden />
                      <input
                        id="q"
                        name="q"
                        defaultValue={q ?? ""}
                        placeholder="RIF o razón social…"
                        autoComplete="off"
                        className="flex h-9 w-full rounded-md border border-periwinkle-300 bg-white py-2 pl-8 pr-3 text-sm outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30"
                      />
                    </div>
                    {query !== "" && (
                      <Button asChild variant="outline" size="sm" aria-label="Limpiar búsqueda">
                        <Link href={`${base}/terceros`}>
                          <Clear aria-hidden />
                        </Link>
                      </Button>
                    )}
                  </form>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <Business className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      {query !== ""
                        ? "Prueba con otro RIF o razón social."
                        : "Registra tu primer cliente o proveedor para usarlo en compras, ventas y retenciones."}
                    </p>
                    {query === "" && (
                      <Button asChild>
                        <Link href={`${base}/terceros/nuevo`}>
                          <Add aria-hidden />
                          Registrar primer tercero
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[48rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">RIF</th>
                          <th scope="col" className="px-4 py-3">Razón social</th>
                          <th scope="col" className="px-4 py-3">Dirección fiscal</th>
                          <th scope="col" className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-mono">
                              <Link
                                href={`${base}/terceros/${r.id}`}
                                className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                                title={`RIF normalizado: ${r.rif}`}
                              >
                                {r.rifOriginal}
                              </Link>
                            </td>
                            <td className="max-w-64 truncate px-4 py-3 font-medium" title={r.razonSocial}>
                              {r.razonSocial}
                            </td>
                            <td className="max-w-64 truncate px-4 py-3 text-periwinkle-500" title={r.direccionFiscal ?? ""}>
                              {r.direccionFiscal ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <Badge variant={r.status === "active" ? "success" : "muted"}>
                                {r.status === "active" ? "Activo" : (r.status ?? "—")}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
