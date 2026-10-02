import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import Download from "@mui/icons-material/Download";
import MenuBook from "@mui/icons-material/MenuBook";
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
import { getPurchaseBook } from "@/modules/fiscal-docs/service";

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

export default async function LibroComprasPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const rows = await getPurchaseBook({ companyId, userId: user.id });
  const base = `/c/${companyId}`;

  const totalBase = rows.reduce((acc, r) => acc.plus(new Decimal(r.baseImponible || 0)), new Decimal(0));
  const totalIva = rows.reduce((acc, r) => acc.plus(new Decimal(r.ivaCausado || 0)), new Decimal(0));
  const totalGeneral = rows.reduce((acc, r) => acc.plus(new Decimal(r.total || 0)), new Decimal(0));

  const kpis = [
    { label: "Documentos", value: String(rows.length), mono: true },
    { label: "Base imponible", value: fmtMonto(totalBase.toString()) },
    { label: "IVA causado", value: fmtMonto(totalIva.toString()) },
    { label: "Total", value: fmtMonto(totalGeneral.toString()) },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Libro de Compras · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
                Reportes · Libro fiscal
              </Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Libro de Compras
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Vista en pantalla del libro. Descarga el CSV con el detalle
                completo para tu contador.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <a
                  href={`/api/companies/${companyId}/reports/purchase-book?format=csv`}
                  download
                >
                  <Download aria-hidden />
                  Descargar CSV
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href={`${base}/compras`}>
                  <MenuBook aria-hidden />
                  Ver compras
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Totales del libro">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        </section>

        {/* Tabla */}
        <section className="mt-8" aria-label="Libro de Compras">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Libro de Compras
                </CardTitle>
                <CardDescription>
                  {rows.length === 0
                    ? "Aún no hay compras registradas en esta empresa."
                    : `${rows.length} ${rows.length === 1 ? "documento" : "documentos"} ordenados por fecha fiscal.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <ReceiptLong className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      El libro se llena solo a medida que registras facturas de
                      compra.
                    </p>
                    <Button asChild>
                      <Link href={`${base}/compras/nueva`}>Registrar compra</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[56rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Fecha</th>
                          <th scope="col" className="px-4 py-3">RIF</th>
                          <th scope="col" className="px-4 py-3">Razón social</th>
                          <th scope="col" className="px-4 py-3">Factura</th>
                          <th scope="col" className="px-4 py-3">Control</th>
                          <th scope="col" className="px-4 py-3 text-right">Base</th>
                          <th scope="col" className="px-4 py-3 text-right">IVA</th>
                          <th scope="col" className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr
                            key={r.id ?? `${r.docNumber}-${r.controlNumber}`}
                            className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                              {fmtFecha(r.fechaFiscal)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono">
                              {r.rif}
                            </td>
                            <td className="max-w-56 truncate px-4 py-3" title={r.razonSocial}>
                              {r.razonSocial}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {r.id ? (
                                <Link
                                  href={`${base}/compras/${r.id}`}
                                  className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                                >
                                  {r.docNumber}
                                </Link>
                              ) : (
                                r.docNumber
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-periwinkle-500">
                              {r.controlNumber}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                              {fmtMonto(r.baseImponible)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                              {fmtMonto(r.ivaCausado)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums">
                              {fmtMonto(r.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-periwinkle-200 bg-periwinkle-50/70 font-semibold">
                          <td colSpan={5} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-periwinkle-500">
                            Totales
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totalBase.toString())}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totalIva.toString())}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totalGeneral.toString())}
                          </td>
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
