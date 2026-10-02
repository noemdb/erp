import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import ArrowForward from "@mui/icons-material/ArrowForward";
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
import { listPeriods } from "@/modules/periods/service";
import { getIvaSummary, checkReproducible } from "@/modules/reporting/summary";

/** "1234567.89" → "1.234.567,89" (solo presentación es-VE). */
function fmtMonto(s: string): string {
  try {
    const d = new Decimal(s || 0).toFixed(2);
    const [ent = "0", dec = "00"] = d.split(".");
    return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
  } catch {
    return s;
  }
}

function formatRange(range: unknown): string {
  if (typeof range !== "string") return "—";
  const m = range.replace(/[[)()\]]/g, "").split(",");
  if (m.length !== 2 || !m[0] || !m[1]) return range;
  const fmt = (iso: string) => {
    const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
    return d ? `${d[3]}-${d[2]}-${d[1]}` : iso.trim();
  };
  return `${fmt(m[0])} → ${fmt(m[1])}`;
}

const periodStatus: Record<string, { label: string; variant: "success" | "warning" | "muted" | "outline" }> = {
  open: { label: "Abierto", variant: "success" },
  under_review: { label: "En revisión", variant: "warning" },
  closed: { label: "Cerrado", variant: "muted" },
  reopened: { label: "Reabierto", variant: "outline" },
};

export default async function ResumenIvaIndex({
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

  const periods = await listPeriods(c);
  const sorted = [...periods].sort((a, b) =>
    String(b.range ?? "").localeCompare(String(a.range ?? "")),
  );

  // Resumen + reproducibilidad por período (derivado de documentos, tolerancia 0,01).
  const rows = await Promise.all(
    sorted.map(async (p) => {
      const [s, repro] = await Promise.all([
        getIvaSummary(c, p.id),
        checkReproducible(c, p.id),
      ]);
      return { p, s, repro };
    }),
  );

  const zero = new Decimal(0);
  const totDeb = rows.reduce((a, r) => { try { return a.plus(r.s.debitoFiscal || 0); } catch { return a; } }, zero);
  const totCre = rows.reduce((a, r) => { try { return a.plus(r.s.creditoFiscal || 0); } catch { return a; } }, zero);
  const totCuota = rows.reduce((a, r) => { try { return a.plus(r.s.cuotaPeriodo || 0); } catch { return a; } }, zero);
  const frozen = rows.filter((r) => r.repro.match === true).length;

  const kpis = [
    { label: "Períodos", value: String(rows.length), mono: true },
    { label: "Débito acumulado", value: fmtMonto(totDeb.toFixed(2)) },
    { label: "Crédito acumulado", value: fmtMonto(totCre.toFixed(2)) },
    { label: "Cuota acumulada", value: fmtMonto(totCuota.toFixed(2)), highlight: true },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Resumen IVA · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
                Reportes · Resumen IVA
              </Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Resumen IVA por período
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
                Consolidación del período: débitos, créditos, exentas y cuota.
                Es insumo para la declaración, no la declaración. Cada fila
                baja al detalle con conciliación, controles y versiones.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`${base}/periodos`}>
                  Ver períodos
                  <ArrowForward aria-hidden />
                </Link>
              </Button>
              <Button asChild>
                <Link href={`${base}/reportes/libro-compras`}>
                  <ReceiptLong aria-hidden />
                  Libros
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="mt-8" aria-label="Acumulados">
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

        {/* Nota versiones */}
        <section className="mt-8" aria-label="Estado de versiones">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-periwinkle-700">
                  <span className="font-semibold text-[#120c27]">
                    {frozen} de {rows.length} con versión reproducible.
                  </span>{" "}
                  <span className="text-periwinkle-500">
                    Congelar guarda snapshot + sha256; regenerar un cerrado debe
                    dar el mismo hash.
                  </span>
                </p>
                <Badge variant={frozen === rows.length && rows.length > 0 ? "success" : "outline"}>
                  {rows.length === 0 ? "Sin períodos" : `${frozen}/${rows.length} congelados`}
                </Badge>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Tabla */}
        <section className="mt-8" aria-label="Resúmenes por período">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Períodos con su resumen
                </CardTitle>
                <CardDescription>
                  {rows.length === 0
                    ? "Aún no hay períodos. Se crean al registrar documentos con su fecha fiscal."
                    : `${rows.length} ${rows.length === 1 ? "período" : "períodos"} del más reciente al más antiguo. Las recibidas van sin neteo.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <ReceiptLong className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      Registra compras o ventas y el resumen del período se
                      calculará solo desde los documentos.
                    </p>
                    <Button asChild>
                      <Link href={`${base}/compras/nueva`}>
                        Registrar compra
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[62rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Período</th>
                          <th scope="col" className="px-4 py-3">Estado</th>
                          <th scope="col" className="px-4 py-3 text-right">Débito</th>
                          <th scope="col" className="px-4 py-3 text-right">Crédito</th>
                          <th scope="col" className="px-4 py-3 text-right">Cuota</th>
                          <th scope="col" className="px-4 py-3">Versión</th>
                          <th scope="col" className="px-4 py-3 text-right">Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ p, s, repro }) => {
                          const st = periodStatus[p.status ?? ""] ?? {
                            label: p.status ?? "—",
                            variant: "outline" as const,
                          };
                          return (
                            <tr
                              key={p.id}
                              className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                            >
                              <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                                <Link
                                  href={`${base}/reportes/resumen-iva/${p.id}`}
                                  className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                                >
                                  {formatRange(p.range)}
                                </Link>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant={st.variant}>{st.label}</Badge>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                                {fmtMonto(s.debitoFiscal)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                                {fmtMonto(s.creditoFiscal)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums">
                                {fmtMonto(s.cuotaPeriodo)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge
                                  variant={
                                    repro.match === true
                                      ? "success"
                                      : repro.match === false
                                        ? "destructive"
                                        : "outline"
                                  }
                                >
                                  {repro.match === null
                                    ? "Sin congelar"
                                    : repro.match
                                      ? `v${repro.version} ok`
                                      : "Cambió"}
                                </Badge>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <Link
                                  href={`${base}/reportes/resumen-iva/${p.id}`}
                                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#120c27] transition-colors hover:bg-periwinkle-100"
                                  aria-label={`Ver resumen del período ${formatRange(p.range)}`}
                                >
                                  Ver
                                  <ArrowForward className="h-3.5 w-3.5" aria-hidden />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-periwinkle-200 bg-periwinkle-50/70 font-semibold">
                          <td colSpan={2} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-periwinkle-500">
                            Acumulado
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totDeb.toFixed(2))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totCre.toFixed(2))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(totCuota.toFixed(2))}
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
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
