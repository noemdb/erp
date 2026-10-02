import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import Add from "@mui/icons-material/Add";
import Approval from "@mui/icons-material/Approval";
import Settings from "@mui/icons-material/Settings";
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
import { listIslrBandeja } from "@/modules/withholdings/issue-islr";
import { getAbonoCriterion } from "@/modules/withholdings/g2-criterion";
import { AbonoCriterionForm } from "./abono-criterion-form";

/** "1234567.89" → "1.234.567,89" (solo presentación). */
function fmtMonto(s: string): string {
  const d = new Decimal(s || 0).toFixed(2);
  const [ent = "0", dec = "00"] = d.split(".");
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${miles},${dec}`;
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(iso);
}

const statusMeta: Record<string, { label: string; variant: "success" | "warning" | "muted" | "outline" | "destructive" | "default" | "secondary" }> = {
  draft: { label: "Borrador", variant: "outline" },
  calculated: { label: "Calculada", variant: "secondary" },
  approved: { label: "Aprobada", variant: "default" },
  issued: { label: "Emitida", variant: "success" },
  delivered: { label: "Entregada", variant: "success" },
  voided: { label: "Anulada", variant: "destructive" },
};

const criterionMeta: Record<string, { label: string; variant: "warning" | "outline" | "success" }> = {
  unset: { label: "G2 sin definir (fail-closed)", variant: "warning" },
  payment_only: { label: "G2: solo pagos", variant: "outline" },
  account_credit_or_payment: { label: "G2: pagos o abonos", variant: "success" },
};

export default async function RetencionesIslrPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const companyContext = await getCompanyContext(companyId, user.id);
  if (!companyContext) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;
  const c = { companyId, userId: user.id };

  const [rows, criterion] = await Promise.all([listIslrBandeja(c), getAbonoCriterion(c)]);
  const sorted = [...rows].sort((a, b) => String(b.fechaEmision ?? "").localeCompare(String(a.fechaEmision ?? "")));
  const crit = criterionMeta[criterion] ?? { label: criterion, variant: "outline" as const };
  const canManage = companyContext.role === "contador" || companyContext.role === "admin";

  const emitidos = sorted.filter((r) => r.status === "issued" || r.status === "delivered");
  const totRetenido = emitidos.reduce((acc, r) => acc.plus(new Decimal(r.totalRetained || 0)), new Decimal(0));
  const pendientes = sorted.filter((r) => !["issued", "delivered", "voided"].includes(r.status ?? "")).length;

  const kpis = [
    { label: "Comprobantes", value: String(sorted.length), mono: true },
    { label: "Retenido emitido", value: fmtMonto(totRetenido.toFixed(2)) },
    { label: "Sin emitir", value: String(pendientes), mono: true },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`ISLR · ${companyContext.company?.razonSocial ?? "Empresa"}`}
        back={{ href: base, label: "Panel" }}
        user={user}
        role={companyContext.role}
        companyCount={memberships.length}
        branding={{
          color: companyContext.company?.colorDistintivo ?? null,
          logoUrl: companyContext.company?.logoUrl ?? null,
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
                  Comprobantes · Retención ISLR
                </Badge>
                <Badge variant={crit.variant}>{crit.label}</Badge>
              </div>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Retenciones ISLR
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Serie provisional hasta definir formato con el contador (G9).
                Emitido es inmutable: solo anula o sustituye.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <Link href={`${base}/retenciones-islr/nueva`}>
                  <Add aria-hidden />
                  Nuevo comprobante
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Totales ISLR">
          <div className="grid gap-4 sm:grid-cols-3">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 3) * 80} className="h-full">
                <Card className="h-full rounded-lg">
                  <CardContent className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
                      {k.label}
                    </p>
                    <p
                      className={
                        k.mono
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

        {/* Criterio G2 */}
        <section className="mt-8" aria-label="Criterio G2 por empresa">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                  <Settings className="h-4 w-4 text-periwinkle-500" aria-hidden />
                  Criterio G2 por empresa
                </CardTitle>
                <CardDescription>
                  {canManage
                    ? "Solo el contador lo cambia, con motivo auditado. Configurarlo no equivale a aprobación fiscal firmada."
                    : `Tu rol (${companyContext.role}) es de solo lectura aquí.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <AbonoCriterionForm companyId={companyId} criterion={criterion} />
                ) : (
                  <p className="text-sm text-periwinkle-700">
                    Actual: <Badge variant={crit.variant}>{crit.label}</Badge>
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Bandeja */}
        <section className="mt-8" aria-label="Comprobantes ISLR">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Comprobantes
                </CardTitle>
                <CardDescription>
                  {sorted.length === 0
                    ? "Aún no hay comprobantes ISLR en esta empresa."
                    : `${sorted.length} ${sorted.length === 1 ? "comprobante" : "comprobantes"} del más reciente al más antiguo.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <Approval className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      Compara criterios y emite tu primer comprobante ISLR sobre
                      un evento asignado.
                    </p>
                    <Button asChild>
                      <Link href={`${base}/retenciones-islr/nueva`}>
                        <Add aria-hidden />
                        Nuevo comprobante
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[58rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Comprobante</th>
                          <th scope="col" className="px-4 py-3">Emisión</th>
                          <th scope="col" className="px-4 py-3">Beneficiario</th>
                          <th scope="col" className="px-4 py-3">Concepto</th>
                          <th scope="col" className="px-4 py-3 text-right">Retenido</th>
                          <th scope="col" className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r) => {
                          const st = statusMeta[r.status ?? ""] ?? {
                            label: r.status ?? "—",
                            variant: "outline" as const,
                          };
                          return (
                            <tr
                              key={r.id}
                              className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                            >
                              <td className="whitespace-nowrap px-4 py-3 font-mono">
                                <Link
                                  href={`${base}/retenciones-islr/${r.id}`}
                                  className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                                >
                                  {r.certificateNumber}
                                </Link>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                                {fmtFecha(r.fechaEmision)}
                              </td>
                              <td className="max-w-52 truncate px-4 py-3" title={`${r.beneficiarioRazon} (${r.beneficiarioRif})`}>
                                {r.beneficiarioRazon}
                                <span className="block font-mono text-xs text-periwinkle-500">{r.beneficiarioRif}</span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant="outline">{r.conceptoCodigo}</Badge>
                                <span className="ml-1.5 text-xs text-periwinkle-500">{r.conceptoNombre}</span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums">
                                {fmtMonto(r.totalRetained)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant={st.variant}>{st.label}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>
      </main>

      <PageFooter context={companyContext.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
