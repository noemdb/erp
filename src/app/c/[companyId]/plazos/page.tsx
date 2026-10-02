import Link from "next/link";
import { redirect } from "next/navigation";
import EventBusy from "@mui/icons-material/EventBusy";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
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
import { authorize } from "@/modules/tenancy/authorize";
import { listObligations, listHolidays, getAlerts } from "@/modules/deadlines/service";
import { KIND_ES, STATE_ES, STATE_VARIANT, es, fmtFecha, fmtRange } from "@/modules/deadlines/labels";
import { ObligationForm, HolidayForm } from "./forms";

function todayCaracas(): string {
  return new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);
}

export default async function PlazosPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const c = { companyId, userId: user.id };
  const [obs, hols, alerts] = await Promise.all([
    listObligations(c),
    listHolidays(c),
    getAlerts(c, todayCaracas()),
  ]);
  const canEdit = (await authorize(companyId, user.id, "periods.close")).ok;
  const sortedHols = [...hols].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const count = (s: string) => alerts.filter((a) => a.state === s).length;
  const kpis = [
    { label: "Vencidos", value: String(count("vencido")) },
    { label: "Vencen hoy", value: String(count("hoy")) },
    { label: "Próximos", value: String(count("proximo")) },
    { label: "Sin regla", value: String(count("sin_regla")) },
  ];

  const detailHref = (kind: string, id: string) =>
    kind === "islr" ? `${base}/retenciones-islr/${id}` : `${base}/retenciones/${id}`;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Plazos · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
          <div className="relative">
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Tablero · Solo lectura fiscal
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Plazos de entrega
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
              Límite = enésimo día hábil del período siguiente (lun–vie menos
              feriados). Las alertas no cambian el estado fiscal; los valores
              los define el contador.
            </p>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Resumen de alertas">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 4) * 80} className="h-full">
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

        {/* Alertas */}
        <section className="mt-8" aria-label="Alertas de entrega">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Comprobantes emitidos
                </CardTitle>
                <CardDescription>
                  {alerts.length === 0
                    ? "Sin comprobantes emitidos para vigilar."
                    : `${alerts.length} ${alerts.length === 1 ? "comprobante" : "comprobantes"} con su límite y estado.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <EventBusy className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      Al emitir comprobantes aparecerán aquí con su fecha
                      límite de entrega.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Comprobante</th>
                          <th scope="col" className="px-4 py-3">Tipo</th>
                          <th scope="col" className="px-4 py-3">Emisión</th>
                          <th scope="col" className="px-4 py-3">Límite</th>
                          <th scope="col" className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...alerts]
                          .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
                          .map((a) => (
                            <tr
                              key={a.id}
                              className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                            >
                              <td className="whitespace-nowrap px-4 py-3 font-mono">
                                <Link
                                  href={detailHref(a.kind, a.id)}
                                  className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                                >
                                  {a.certificate}
                                </Link>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-periwinkle-500">
                                {es(KIND_ES, a.kind)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums">
                                {fmtFecha(a.fechaEmision)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums">
                                {a.due ? fmtFecha(a.due) : "sin regla"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant={STATE_VARIANT[a.state] ?? "outline"}>
                                  {es(STATE_ES, a.state)}
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

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Obligaciones */}
          <Reveal className="h-full">
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Obligaciones
                </CardTitle>
                <CardDescription>
                  Norma, artículo, vigencia y días hábiles por tipo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {obs.length === 0 ? (
                  <p className="text-sm text-periwinkle-500">
                    Sin obligaciones: todo comprobante sale “sin regla”.
                  </p>
                ) : (
                  <ul className="mb-4 space-y-2">
                    {obs.map((o) => (
                      <li
                        key={o.id}
                        className="rounded-md border border-periwinkle-100 px-3 py-2.5 text-sm"
                      >
                        <p className="font-medium">{es(KIND_ES, o.kind)}</p>
                        <p className="text-xs text-periwinkle-500">
                          {o.fuenteNormativa} art. {o.articulo} · {o.diasHabiles}{" "}
                          días hábiles · {fmtRange(o.effectiveRange)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && <ObligationForm companyId={companyId} />}
              </CardContent>
            </Card>
          </Reveal>

          {/* Feriados */}
          <Reveal className="h-full" delay={80}>
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Feriados
                </CardTitle>
                <CardDescription>
                  Días que no cuentan como hábiles en el límite.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedHols.length === 0 ? (
                  <p className="text-sm text-periwinkle-500">
                    Sin feriados registrados.
                  </p>
                ) : (
                  <ul className="mb-4 space-y-2">
                    {sortedHols.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-periwinkle-100 px-3 py-2.5 text-sm"
                      >
                        <span className="font-mono text-xs tabular-nums">
                          {fmtFecha(h.fecha)}
                        </span>
                        <span className="truncate text-periwinkle-500" title={h.descripcion ?? ""}>
                          {h.descripcion ?? "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && <HolidayForm companyId={companyId} />}
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {!canEdit && (
          <p className="mt-4 flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
            <InfoOutlined className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Tu rol ({ctx.role}) es de solo lectura aquí. Obligaciones y
            feriados los gestiona el contador.
          </p>
        )}
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
