import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import AccountBalance from "@mui/icons-material/AccountBalance";
import Add from "@mui/icons-material/Add";
import Approval from "@mui/icons-material/Approval";
import Payments from "@mui/icons-material/Payments";
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
import { listSettlementEvents } from "@/modules/payments/service";

function fmtFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

/** "1234567.89" → "1.234.567,89" (solo presentación). */
function fmtMonto(s: string): string {
  const d = new Decimal(s || 0).toFixed(2);
  const [ent = "0", dec = "00"] = d.split(".");
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${miles},${dec}`;
}

const criterionMeta: Record<string, { label: string; variant: "warning" | "outline" | "success" }> = {
  unset: { label: "Criterio G2 sin definir", variant: "warning" },
  payment_only: { label: "G2: solo pagos", variant: "outline" },
  account_credit_or_payment: { label: "G2: pagos o abonos", variant: "success" },
};

export default async function PagosPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const rows = await listSettlementEvents({ companyId, userId: user.id });
  const sorted = [...rows].sort((a, b) => String(b.eventDate ?? "").localeCompare(String(a.eventDate ?? "")));
  const criterion = (ctx.company as { abonoCriterion?: string } | null)?.abonoCriterion ?? "unset";
  const crit = criterionMeta[criterion] ?? { label: criterion, variant: "outline" as const };

  const totMonto = sorted.reduce((acc, r) => acc.plus(new Decimal(r.amount || 0)), new Decimal(0));
  const totAsignado = sorted.reduce((acc, r) => acc.plus(new Decimal(r.allocated || 0)), new Decimal(0));
  const totPendiente = totMonto.minus(totAsignado);

  const kpis = [
    { label: "Eventos", value: String(sorted.length), mono: true },
    { label: "Monto total", value: fmtMonto(totMonto.toFixed(2)) },
    { label: "Asignado", value: fmtMonto(totAsignado.toFixed(2)) },
    { label: "Pendiente de asignar", value: fmtMonto(totPendiente.toFixed(2)), highlight: true },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Pagos · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md px-3 py-1">
                  Liquidación · Pagos y abonos
                </Badge>
                <Badge variant={crit.variant}>{crit.label}</Badge>
              </div>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Pagos y abonos en cuenta
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Eventos con fecha, monto y asignación a compras. Registrar o
                asignar no emite retención por sí solo; la emisión ISLR sigue el
                criterio G2 de la empresa.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <Link href={`${base}/pagos/nuevo`}>
                  <Add aria-hidden />
                  Registrar evento
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`${base}/retenciones-islr/nueva`}>
                  <Approval aria-hidden />
                  Retención ISLR
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Totales de liquidación">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 4) * 80} className="h-full">
                <Card
                  className={
                    "highlight" in k && k.highlight
                      ? "h-full rounded-lg border-[#352574]/30 bg-gradient-to-br from-[#120c27] to-[#352574] text-white"
                      : "h-full rounded-lg"
                  }
                >
                  <CardContent className="p-5">
                    <p
                      className={
                        "highlight" in k && k.highlight
                          ? "text-[11px] font-semibold uppercase tracking-wider text-white/70"
                          : "text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700"
                      }
                    >
                      {k.label}
                    </p>
                    <p
                      className={
                        "mono" in k && k.mono
                          ? "mt-1 text-2xl font-bold tracking-tight tabular-nums"
                          : "mt-1 font-mono text-2xl font-bold tracking-tight tabular-nums"
                      }
                    >
                      {k.value}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Tabla */}
        <section className="mt-8" aria-label="Eventos de liquidación">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Eventos registrados
                </CardTitle>
                <CardDescription>
                  {sorted.length === 0
                    ? "Aún no hay pagos ni abonos registrados en esta empresa."
                    : `${sorted.length} ${sorted.length === 1 ? "evento" : "eventos"} del más reciente al más antiguo.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <Payments className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      Registra un pago o un abono en cuenta y asígnalo a sus
                      compras para habilitar la retención ISLR.
                    </p>
                    <Button asChild>
                      <Link href={`${base}/pagos/nuevo`}>
                        <Add aria-hidden />
                        Registrar primer evento
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[64rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Tipo</th>
                          <th scope="col" className="px-4 py-3">Fecha</th>
                          <th scope="col" className="px-4 py-3">Proveedor</th>
                          <th scope="col" className="px-4 py-3 text-right">Monto</th>
                          <th scope="col" className="px-4 py-3 text-right">Asignado</th>
                          <th scope="col" className="px-4 py-3 text-right">Pendiente</th>
                          <th scope="col" className="px-4 py-3">Referencia</th>
                          <th scope="col" className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r) => {
                          const pendiente = new Decimal(r.amount || 0).minus(r.allocated || 0);
                          const isAbono = r.eventType !== "payment";
                          return (
                            <tr
                              key={r.id}
                              className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                            >
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant={isAbono ? "secondary" : "default"}>
                                  {isAbono ? "Abono en cuenta" : "Pago"}
                                </Badge>
                                {r.inferred ? (
                                  <span className="ml-1.5 text-xs text-amber-700" title="Dato declarado como inferido">
                                    inferido
                                  </span>
                                ) : null}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                                <Link
                                  href={`${base}/pagos/${r.id}`}
                                  className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                                >
                                  {fmtFecha(r.eventDate)}
                                </Link>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono">
                                {r.rif}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                                {fmtMonto(r.amount)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                                {fmtMonto(r.allocated)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                                <span className={pendiente.gt(0) ? "font-semibold text-amber-700" : ""}>
                                  {fmtMonto(pendiente.toFixed(2))}
                                </span>
                              </td>
                              <td className="max-w-44 truncate px-4 py-3 text-periwinkle-500" title={r.sourceRef ?? r.method ?? ""}>
                                {r.sourceRef ?? r.method ?? "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant={r.status === "active" ? "success" : "muted"}>
                                  {r.status === "active" ? "Activo" : (r.status ?? "—")}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-periwinkle-200 bg-periwinkle-50/70 font-semibold">
                          <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-periwinkle-500">
                            Totales
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totMonto.toFixed(2))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totAsignado.toFixed(2))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totPendiente.toFixed(2))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Nota G2 */}
        <section className="mt-8" aria-label="Criterio de abono en cuenta">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                    <AccountBalance className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="text-sm text-periwinkle-700">
                    <span className="font-semibold text-[#120c27]">
                      {criterion === "unset"
                        ? "Sin criterio G2: solo se emite ISLR sobre pagos asignados si ambos escenarios convergen. "
                        : "Criterio G2 configurado. "}
                    </span>
                    <span className="text-periwinkle-500">
                      Solo el contador puede cambiarlo, con motivo auditado. No
                      se infieren abonos automáticamente.
                    </span>
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={`${base}/configuracion`}>
                    Ver configuración
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </section>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
