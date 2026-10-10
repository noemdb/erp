import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import Add from "@mui/icons-material/Add";
import Download from "@mui/icons-material/Download";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
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
import { listIva } from "@/modules/withholdings/issue-iva";
import { findCorrelativoGaps } from "@/modules/withholdings/correlativo-gaps";

const estadoComprobante: Record<string, { label: string; variant: "success" | "secondary" | "muted" | "outline" }> = {
  issued: { label: "Emitido", variant: "success" },
  delivered: { label: "Entregado", variant: "secondary" },
  voided: { label: "Anulado", variant: "muted" },
};

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

export default async function RetencionesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const rows = (await listIva({ companyId, userId: user.id })).sort((a, b) => {
    const fa = a.fechaEmision ?? "";
    const fb = b.fechaEmision ?? "";
    return fa < fb ? 1 : fa > fb ? -1 : 0;
  });
  const vigentes = rows.filter((r) => r.status !== "voided");
  const totalRetenido = vigentes.reduce(
    (acc, r) => acc.plus(new Decimal(r.totalRetained || 0)),
    new Decimal(0),
  );
  // Huecos sobre lo cargado (límite 200): sin falsos positivos, puede omitir.
  const gaps = findCorrelativoGaps(
    rows.map((r) => ({ certificateNumber: r.certificateNumber, status: r.status ?? "", totalRetained: r.totalRetained ?? "0" })),
    8,
  );

  const kpis = [
    { label: "Comprobantes", value: String(vigentes.length), mono: true },
    { label: "Retenido total", value: fmtMonto(totalRetenido.toString()) },
    {
      label: "Emitidos",
      value: String(rows.filter((r) => r.status === "issued").length),
      mono: true,
    },
    {
      label: "Entregados",
      value: String(rows.filter((r) => r.status === "delivered").length),
      mono: true,
    },
    {
      label: "Secuencia",
      value: gaps.faltantesTotal === 0 && gaps.noComparables.length === 0 ? "Sin huecos" : `Faltan ${gaps.faltantesTotal}`,
      mono: true,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Retenciones IVA · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
                Comprobantes · Retención IVA
              </Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Retenciones IVA
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Comprobantes que prueban la retención practicada, con
                numeración propia sin huecos. Lo emitido no se edita: se
                entrega o se anula.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <Link href={`${base}/retenciones/nueva`}>
                  <Add aria-hidden />
                  Nuevo comprobante
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`/api/companies/${companyId}/reports/iva-withholdings?format=csv`}
                  download
                >
                  <Download aria-hidden />
                  Descargar CSV
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Totales de retenciones">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 4) * 80} className="h-full">
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
          {gaps.faltantesTotal > 0 && (
            <p className="mt-3 text-sm text-periwinkle-500" role="status">
              Faltan {gaps.faltantesTotal} número(s) en la secuencia
              {gaps.groups.some((g) => g.faltantes.length > 0)
                ? `: ${gaps.groups.flatMap((g) => g.faltantes).slice(0, 5).join(", ")}${gaps.faltantesTotal > 5 ? "…" : ""}`
                : ""}
              . Revisa anulados frente a huecos reales y corre `series:reconcile` antes de emitir.
            </p>
          )}
        </section>

        {/* Tabla */}
        <section className="mt-8" aria-label="Comprobantes de retención">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Comprobantes emitidos
                </CardTitle>
                <CardDescription>
                  {rows.length === 0
                    ? "Aún no hay comprobantes de retención en esta empresa."
                    : `${rows.length} ${rows.length === 1 ? "comprobante" : "comprobantes"}, del más reciente al más antiguo.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <ReceiptLong className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      Emite tu primer comprobante sobre facturas de compra
                      validadas para empezar.
                    </p>
                    <Button asChild>
                      <Link href={`${base}/retenciones/nueva`}>
                        <Add aria-hidden />
                        Nuevo comprobante
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[44rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Comprobante</th>
                          <th scope="col" className="px-4 py-3">Emisión</th>
                          <th scope="col" className="px-4 py-3 text-right">Retenido</th>
                          <th scope="col" className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const est = estadoComprobante[r.status] ?? {
                            label: r.status,
                            variant: "outline" as const,
                          };
                          return (
                            <tr
                              key={r.id}
                              className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                            >
                              <td className="whitespace-nowrap px-4 py-3">
                                <Link
                                  href={`${base}/retenciones/${r.id}`}
                                  className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                                >
                                  {r.certificateNumber}
                                </Link>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                                {fmtFecha(r.fechaEmision ?? "")}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums">
                                {fmtMonto(r.totalRetained)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant={est.variant}>{est.label}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-periwinkle-200 bg-periwinkle-50/70 font-semibold">
                          <td colSpan={2} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-periwinkle-500">
                            Retenido vigente
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totalRetenido.toString())}
                          </td>
                          <td className="px-4 py-3" />
                        </tr>
                      </tfoot>
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
