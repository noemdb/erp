import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Cancel from "@mui/icons-material/Cancel";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Download from "@mui/icons-material/Download";
import Warning from "@mui/icons-material/Warning";
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
import { listPeriods } from "@/modules/periods/service";
import {
  getIvaSummary,
  getConciliation,
  getAutoControls,
  checkReproducible,
  listVersions,
} from "@/modules/reporting/summary";
import { FreezeButton } from "./freeze-button";

/** "1234567.89" → "1.234.567,89" (solo presentación es-VE). */
function fmtMonto(s: string): string {
  try {
    const d = new Decimal(s || 0).toFixed(2);
    const [ent = "0", dec = "00"] = d.split(".");
    const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${miles},${dec}`;
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

function formatDateTime(v: unknown): string {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const periodStatus: Record<string, { label: string; variant: "success" | "warning" | "muted" | "outline" }> = {
  open: { label: "Abierto", variant: "success" },
  under_review: { label: "En revisión", variant: "warning" },
  closed: { label: "Cerrado", variant: "muted" },
  reopened: { label: "Reabierto", variant: "outline" },
};

export default async function ResumenDetail({
  params,
}: {
  params: Promise<{ companyId: string; periodId: string }>;
}) {
  const { companyId, periodId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;
  const c = { companyId, userId: user.id };

  const periods = await listPeriods(c);
  const per = periods.find((p) => p.id === periodId);
  if (!per) redirect(`${base}/reportes/resumen-iva`);

  const [s, conci, controles, repro, versions] = await Promise.all([
    getIvaSummary(c, periodId),
    getConciliation(c, periodId),
    getAutoControls(c, periodId),
    checkReproducible(c, periodId),
    listVersions(c, periodId),
  ]);
  const auth = await authorize(companyId, user.id, "periods.close");

  const st = periodStatus[per.status ?? ""] ?? {
    label: per.status ?? "—",
    variant: "outline" as const,
  };

  const kpis = [
    { label: "Débito fiscal", value: fmtMonto(s.debitoFiscal) },
    { label: "Crédito fiscal", value: fmtMonto(s.creditoFiscal) },
    { label: "Cuota del período", value: fmtMonto(s.cuotaPeriodo), highlight: true },
    { label: "Ret. IVA emitidas", value: fmtMonto(s.retIvaEmitidas) },
  ];

  const filas: { label: string; value: string; href?: string; note?: string }[] = [
    { label: "Compras gravadas", value: fmtMonto(s.comprasGravadas), href: `${base}/reportes/libro-compras` },
    { label: "Compras exentas", value: fmtMonto(s.comprasExentas), href: `${base}/reportes/libro-compras` },
    { label: "Crédito fiscal", value: fmtMonto(s.creditoFiscal) },
    { label: "Ventas gravadas", value: fmtMonto(s.ventasGravadas), href: `${base}/reportes/libro-ventas` },
    { label: "Ventas exentas", value: fmtMonto(s.ventasExentas), href: `${base}/reportes/libro-ventas` },
    { label: "Débito fiscal", value: fmtMonto(s.debitoFiscal) },
    { label: "Ret. IVA emitidas", value: fmtMonto(s.retIvaEmitidas), href: `${base}/retenciones` },
    { label: "Ret. ISLR emitidas", value: fmtMonto(s.retIslrEmitidas), href: `${base}/retenciones-islr` },
    {
      label: "Ret. recibidas aplicadas",
      value: fmtMonto(s.retRecibidasAplicadas),
      href: `${base}/retenciones-recibidas`,
      note: "Informativo, sin neteo: el neteo lo decide el contador.",
    },
  ];

  const hallazgos = controles.items.reduce((a, i) => a + i.hallazgos.length, 0);

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Resumen IVA · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/reportes/resumen-iva`, label: "Resúmenes" }}
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
                Resumen IVA
              </h1>
              <p className="mt-2 font-mono text-sm tabular-nums text-periwinkle-500">
                {formatRange(per.range)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={st.variant}>{st.label}</Badge>
                <Badge variant={repro.match === false ? "destructive" : repro.match ? "success" : "outline"}>
                  {repro.match === null
                    ? "Sin versiones congeladas"
                    : repro.match
                      ? `Reproducible · v${repro.version}`
                      : "NO reproducible — cambió tras congelar"}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`${base}/periodos/${periodId}`}>
                  Ver período
                  <ArrowForward aria-hidden />
                </Link>
              </Button>
              <Button asChild>
                <a
                  href={`/api/companies/${companyId}/reports/purchase-book?format=csv`}
                  download
                >
                  <Download aria-hidden />
                  Libro Compras CSV
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="mt-8" aria-label="Totales del resumen">
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
                    <p className="mt-1 font-mono text-2xl font-bold tracking-tight tabular-nums">
                      {k.value}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Resumen con drill-down */}
          <Reveal className="h-full">
            <Card className="h-full overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Resumen del período
                </CardTitle>
                <CardDescription>
                  Derivado de documentos y comprobantes. Toca cada fila para
                  bajar al libro o a la bandeja.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {filas.map((f) => (
                      <tr
                        key={f.label}
                        className="border-t border-periwinkle-100 first:border-0"
                      >
                        <td className="px-6 py-2.5">
                          {f.href ? (
                            <Link
                              href={f.href}
                              className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                            >
                              {f.label}
                            </Link>
                          ) : (
                            <span className="font-medium">{f.label}</span>
                          )}
                          {f.note && (
                            <span className="block text-xs text-periwinkle-500">
                              {f.note}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-2.5 text-right font-mono tabular-nums">
                          {f.value}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-periwinkle-200 bg-periwinkle-50/70">
                      <td className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-periwinkle-500">
                        Cuota (débito − crédito)
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-mono font-bold tabular-nums">
                        {fmtMonto(s.cuotaPeriodo)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </Reveal>

          {/* Conciliación */}
          <Reveal className="h-full" delay={80}>
            <Card className="h-full overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base tracking-tight">
                    Conciliación
                  </CardTitle>
                  <Badge variant={conci.ok ? "success" : "destructive"}>
                    {conci.ok ? "Cuadra" : "Diferencias"}
                  </Badge>
                </div>
                <CardDescription>
                  Libros ↔ resumen ↔ comprobantes, tolerancia 0,01.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {conci.items.map((it) => (
                    <li
                      key={it.nombre}
                      className="flex items-start gap-3 rounded-md border border-periwinkle-100 px-3 py-2.5"
                    >
                      {it.ok ? (
                        <CheckCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-icy-aqua-700"
                          aria-hidden
                        />
                      ) : (
                        <Cancel
                          className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{it.nombre}</p>
                        <p className="font-mono text-xs tabular-nums text-periwinkle-500">
                          {fmtMonto(it.esperado)} vs {fmtMonto(it.real)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Controles F8 */}
        <section className="mt-8" aria-label="Controles automáticos">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base tracking-tight">
                    Controles automáticos
                  </CardTitle>
                  <Badge variant={controles.ok ? "success" : "warning"}>
                    {controles.ok
                      ? "0 hallazgos"
                      : `${hallazgos} ${hallazgos === 1 ? "hallazgo" : "hallazgos"}`}
                  </Badge>
                </div>
                <CardDescription>
                  Solo lectura: base, IVA, duplicados, retenciones, respaldo y
                  convivencia factura/Z. No cambian el resumen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 md:grid-cols-2">
                  {controles.items.map((c) => (
                    <li
                      key={c.key}
                      className="flex items-start gap-3 rounded-md border border-periwinkle-100 px-3 py-2.5"
                    >
                      {c.hallazgos.length === 0 ? (
                        <CheckCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-icy-aqua-700"
                          aria-hidden
                        />
                      ) : (
                        <Warning
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.nombre}</p>
                        {c.hallazgos.length > 0 ? (
                          <p className="mt-0.5 break-words text-xs text-periwinkle-500">
                            {c.hallazgos.slice(0, 5).join("; ")}
                            {c.hallazgos.length > 5 &&
                              ` (+${c.hallazgos.length - 5} más)`}
                          </p>
                        ) : (
                          <p className="text-xs text-periwinkle-500">
                            Sin hallazgos · {c.key}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Versiones */}
        <section className="mt-8" aria-label="Versiones congeladas">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Versiones congeladas
                </CardTitle>
                <CardDescription>
                  Cada versión guarda snapshot + sha256. Regenerar un período
                  cerrado debe dar el mismo hash.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm text-periwinkle-700">
                    Estado:{" "}
                    <span className="font-semibold text-[#120c27]">
                      {repro.match === null
                        ? "sin versiones"
                        : repro.match
                          ? `reproducible (v${repro.version})`
                          : "NO reproducible — cambió tras congelar"}
                    </span>
                  </p>
                  <FreezeButton
                    companyId={companyId}
                    periodId={periodId}
                    canFreeze={auth.ok}
                  />
                </div>
                {versions.length === 0 ? (
                  <p className="mt-4 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    Aún no hay versiones. Congela cuando el resumen cuadre y el
                    contador lo apruebe.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-2.5">
                            Versión
                          </th>
                          <th scope="col" className="px-4 py-2.5">
                            SHA-256
                          </th>
                          <th scope="col" className="px-4 py-2.5">
                            Generada el
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions.map((v) => (
                          <tr
                            key={v.id}
                            className="border-b border-periwinkle-100 last:border-0"
                          >
                            <td className="whitespace-nowrap px-4 py-2.5 font-semibold">
                              v{v.version} · {v.kind} · {v.format}
                            </td>
                            <td
                              className="max-w-52 truncate px-4 py-2.5 font-mono text-xs text-periwinkle-500"
                              title={v.sha256}
                            >
                              {v.sha256.slice(0, 16)}…
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums">
                              {formatDateTime(v.generatedAt)}
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
