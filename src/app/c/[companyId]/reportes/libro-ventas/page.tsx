import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import Add from "@mui/icons-material/Add";
import Download from "@mui/icons-material/Download";
import MenuBook from "@mui/icons-material/MenuBook";
import PointOfSale from "@mui/icons-material/PointOfSale";
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
import { getSalesBook } from "@/modules/sales/service";

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

const kindMeta: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "warning" | "muted" }> = {
  invoice: { label: "Factura", variant: "default" },
  z_summary: { label: "Reporte Z", variant: "secondary" },
  credit_note: { label: "NC", variant: "warning" },
  debit_note: { label: "ND", variant: "warning" },
  export: { label: "Exportación", variant: "outline" },
  third_party: { label: "Cta. terceros", variant: "muted" },
};

export default async function LibroVentasPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const rows = await getSalesBook({ companyId, userId: user.id });
  const base = `/c/${companyId}`;
  const zMode = (ctx.company as { salesMode?: string } | null)?.salesMode === "z";

  const totalBase = rows.reduce((acc, r) => acc.plus(new Decimal(r.baseImponible || 0)), new Decimal(0));
  const totalIva = rows.reduce((acc, r) => acc.plus(new Decimal(r.ivaCausado || 0)), new Decimal(0));
  const totalGeneral = rows.reduce((acc, r) => acc.plus(new Decimal(r.total || 0)), new Decimal(0));

  const kpis = [
    { label: "Registros", value: String(rows.length), mono: true },
    { label: "Base imponible", value: fmtMonto(totalBase.toString()) },
    { label: "Débito fiscal", value: fmtMonto(totalIva.toString()) },
    { label: "Total", value: fmtMonto(totalGeneral.toString()) },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Libro de Ventas · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
                  Reportes · Libro fiscal
                </Badge>
                <Badge variant={zMode ? "secondary" : "outline"}>
                  {zMode ? "Modo reportes Z" : "Modo facturas"}
                </Badge>
              </div>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Libro de Ventas
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                {zMode
                  ? "Deriva de reportes Z de la máquina fiscal, en orden cronológico y con identidad propia por rango."
                  : "Deriva de las ventas registradas, en orden cronológico por fecha fiscal. Descarga el CSV para tu contador."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <a
                  href={`/api/companies/${companyId}/reports/sales-book?format=csv`}
                  download
                >
                  <Download aria-hidden />
                  Descargar CSV
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href={zMode ? `${base}/ventas/z` : `${base}/ventas/nueva`}>
                  <Add aria-hidden />
                  {zMode ? "Cargar Z" : "Nueva venta"}
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
        <section className="mt-8" aria-label="Libro de Ventas">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Libro de Ventas
                </CardTitle>
                <CardDescription>
                  {rows.length === 0
                    ? zMode
                      ? "Aún no hay reportes Z cargados en esta empresa."
                      : "Aún no hay ventas registradas en esta empresa."
                    : `${rows.length} ${rows.length === 1 ? "registro" : "registros"} ordenados por fecha fiscal.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <PointOfSale className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      {zMode
                        ? "El libro se llena solo a medida que cargas reportes Z de la máquina fiscal."
                        : "El libro se llena solo a medida que registras facturas de venta."}
                    </p>
                    <Button asChild>
                      <Link href={zMode ? `${base}/ventas/z` : `${base}/ventas/nueva`}>
                        {zMode ? "Cargar primer Z" : "Registrar venta"}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[62rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Fecha</th>
                          <th scope="col" className="px-4 py-3">Tipo</th>
                          <th scope="col" className="px-4 py-3">RIF / Máquina</th>
                          <th scope="col" className="px-4 py-3">Razón social</th>
                          <th scope="col" className="px-4 py-3">Factura / Rango Z</th>
                          <th scope="col" className="px-4 py-3 text-right">Base</th>
                          <th scope="col" className="px-4 py-3 text-right">IVA</th>
                          <th scope="col" className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const km = kindMeta[r.kind] ?? { label: r.kind, variant: "outline" as const };
                          return (
                            <tr
                              key={`${r.docNumber}-${i}`}
                              className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                            >
                              <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                                {fmtFecha(r.fechaFiscal)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant={km.variant}>{km.label}</Badge>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono">
                                {r.rif}
                              </td>
                              <td className="max-w-56 truncate px-4 py-3" title={r.razonSocial}>
                                {r.razonSocial}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-medium">
                                {r.docNumber}
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
                          );
                        })}
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

        {/* Nota de dominio */}
        <section className="mt-8" aria-label="Nota fiscal">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                    <ReceiptLong className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="text-sm text-periwinkle-700">
                    <span className="font-semibold text-[#120c27]">El libro es una salida derivada: </span>
                    no se edita directo, se genera desde {zMode ? "los reportes Z" : "los documentos de venta"}. Su débito alimenta el Resumen IVA.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={`${base}/reportes/resumen-iva`}>
                    <MenuBook aria-hidden />
                    Ver resúmenes
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
