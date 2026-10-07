import Link from "next/link";
import { redirect } from "next/navigation";
import AccountBalance from "@mui/icons-material/AccountBalance";
import Approval from "@mui/icons-material/Approval";
import ArrowForward from "@mui/icons-material/ArrowForward";
import AttachMoney from "@mui/icons-material/AttachMoney";
import Business from "@mui/icons-material/Business";
import Calculate from "@mui/icons-material/Calculate";
import FactCheck from "@mui/icons-material/FactCheck";
import Gavel from "@mui/icons-material/Gavel";
import Payments from "@mui/icons-material/Payments";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Close from "@mui/icons-material/Close";
import History from "@mui/icons-material/History";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import WarningAmber from "@mui/icons-material/WarningAmber";
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
import { canManageUsersAnywhere } from "@/modules/identity/admin";
import { getCompanyContext, listUserCompanies } from "@/modules/tenancy/repo";
import { getAutoControls, getConciliation, getIvaSummary, type IvaSummary } from "@/modules/reporting/summary";
import { listPeriods } from "@/modules/periods/service";
import { listAuditEvents } from "@/modules/audit/queries";
import { TrendChart, CompositionDonut, CuotaChart, RetencionesChart } from "./trend-chart";
import { NewCompanyButton, EditCompanyButton } from "@/components/companies/company-dialog";
import { CompanySwitch, type SwitchCompany } from "@/components/companies/company-switch";
import { CompanyForm } from "@/components/companies/company-form";
import { QuickActions } from "@/components/companies/quick-actions";
import { cn } from "@/lib/utils";

/** "1234.56" (almacenamiento) → "1.234,56" (presentación es-VE). */
function fmtVe(s: string): string {
  const [int = "0", dec = "00"] = s.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${(dec + "00").slice(0, 2)}`;
}

function periodLabel(range: unknown): string {
  if (typeof range !== "string") return "—";
  const m = range.replace(/[[)()]/g, "").split(",")[0]?.split("-");
  return m && m.length >= 2 ? `${m[1]}-${m[0]?.slice(2)}` : "—";
}

/** Estado de período en es-VE (la BD guarda `open/under_review/...`). */
function periodStatusVe(status: string): string {
  switch (status) {
    case "open":
      return "abierto";
    case "under_review":
      return "en revisión";
    case "closed":
      return "cerrado";
    case "reopened":
      return "reabierto";
    default:
      return status;
  }
}

/** Date → "05-10-2026 14:32" (America/Caracas). */
function fmtDateTime(d: Date | string): string {
  const dt = new Date(d);
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(dt);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const memberships = await listMemberships(user.id);
  const companies = await listUserCompanies(user.id);
  const canManageUsers = await canManageUsersAnywhere(user.id);

  // Sin membresías: alta directa (la ruta /companies está en desuso).
  if (memberships.length === 0 || companies.length === 0) {
    return (
      <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
        <AppHeader
          title="Panel general"
          user={user}
          companyCount={0}
          canManageUsers={canManageUsers}
        />
        <main className="mx-auto max-w-2xl px-6 pb-16">
          <section className="pt-10" aria-label="Sin empresas">
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Primer paso
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight">
              Aún no perteneces a ninguna empresa
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-periwinkle-500">
              Registra tu primera empresa para ver su resumen fiscal:
              indicadores, gráficos y conciliación.
            </p>
          </section>
          <section className="mt-8" aria-label="Crear empresa">
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardHeader className="pb-4">
                <CardTitle className="text-xl tracking-tight">
                  Registrar empresa
                </CardTitle>
                <CardDescription>
                  Quedarás como administrador. El RIF no puede repetirse.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompanyForm />
              </CardContent>
            </Card>
          </section>
        </main>

        <PageFooter context="Panel general" />
      </div>
    );
  }
  const selected = companies.find((c) => c.id === sp.company) ?? null;
  const overviews = await Promise.all(
    companies.map(async (c) => ({
      company: c,
      ctx: await getCompanyContext(c.id, user.id),
    }))
  );
  // Columnas según cantidad: las tarjetas siempre llenan el ancho (máx. 3).
  const cardsGrid = cn(
    "grid gap-5",
    overviews.length === 2 && "md:grid-cols-2",
    overviews.length >= 3 && "md:grid-cols-2 lg:grid-cols-3"
  );

  // Sin empresa seleccionada: solo tarjetas + mensaje, sin resumen.
  if (!selected) {
    return (
      <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
        <AppHeader
          title="Panel general"
          user={user}
          companyCount={memberships.length}
          canManageUsers={canManageUsers}
        />
        <main className="mx-auto max-w-6xl px-6 pb-16">
          {/* Empresas */}
          <section className="pt-10" aria-label="Empresas">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold tracking-tight">Empresas</h2>
              <NewCompanyButton />
            </div>
            <div className={cardsGrid}>
              {overviews.map(({ company }) => (
                <article
                  key={company.id}
                  className="flex h-full flex-col overflow-hidden rounded-md border border-periwinkle-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className={cn(
                      "relative h-24 shrink-0 overflow-hidden",
                      !company.colorDistintivo &&
                        "bg-gradient-to-br from-[#120c27] to-[#352574]"
                    )}
                    style={
                      company.colorDistintivo
                        ? { backgroundColor: company.colorDistintivo }
                        : undefined
                    }
                  >
                    <div
                      className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:28px_28px]"
                      aria-hidden
                    />
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={`Logo de ${company.razonSocial}`}
                        loading="lazy"
                        className="absolute bottom-2 left-4 h-14 max-w-40 rounded-sm bg-white/90 object-contain p-1 shadow-sm"
                      />
                    ) : (
                      <AccountBalance
                        className="absolute -bottom-3 left-4 h-16 w-16 text-white/15"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="px-5 pt-4">
                    <h3 className="truncate font-semibold tracking-tight">
                      {company.razonSocial}
                    </h3>
                    <p className="mt-0.5 truncate font-mono text-xs text-periwinkle-500">
                      RIF {company.rifOriginal}
                    </p>
                  </div>
                  <p className="px-5 pt-2 text-sm leading-relaxed text-periwinkle-600">
                    {company.condicionIva}
                  </p>
                  <div className="mt-auto flex gap-2 px-5 pb-5 pt-4">
                    <Link
                      href={`/c/${company.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#120c27] px-4 py-2 text-sm font-medium text-white shadow-md shadow-[#120c27]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      Entrar
                      <ArrowForward className="h-4 w-4" aria-hidden />
                    </Link>
                    <Link
                      href={`/dashboard?company=${company.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-md border border-periwinkle-200 bg-white px-4 py-2 text-sm font-medium text-periwinkle-600 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]"
                    >
                      Ver resumen
                    </Link>
                    <EditCompanyButton
                      iconOnly
                      company={{
                        id: company.id,
                        rif: company.rifOriginal,
                        razonSocial: company.razonSocial,
                        condicionIva: company.condicionIva,
                        domicilioFiscal: company.domicilioFiscal,
                        nombreComercial: company.nombreComercial,
                        telefono: company.telefono,
                        emailContacto: company.emailContacto,
                        colorDistintivo: company.colorDistintivo,
                        logoUrl: company.logoUrl,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8" aria-label="Sin selección">
            <Card className="rounded-lg border-icy-aqua-200 bg-gradient-to-r from-icy-aqua-50/60 to-white">
              <CardContent className="p-5 text-sm leading-relaxed text-periwinkle-600">
                No hay empresa seleccionada. Elige una tarjeta para ver su
                resumen fiscal: indicadores, gráficos, conciliación y
                actividad.
              </CardContent>
            </Card>
          </section>
        </main>

        <PageFooter context="Panel general" />
      </div>
    );
  }

  const ctx = await getCompanyContext(selected.id, user.id);
  if (!ctx) redirect("/dashboard");

  // Períodos completos vía servicio (ctx.periods trae máx. 5 sin orden).
  const periods = (await listPeriods({ companyId: selected.id, userId: user.id })).sort((a, b) =>
    String(a.range).localeCompare(String(b.range))
  );
  const current =
    periods.find((p) => p.status === "open") ?? periods[periods.length - 1];
  const viewing =
    periods.find((p) => p.id === sp.period) ?? current;

  const ZERO: IvaSummary = {
    comprasGravadas: "0.00",
    comprasExentas: "0.00",
    creditoFiscal: "0.00",
    ventasGravadas: "0.00",
    ventasExentas: "0.00",
    debitoFiscal: "0.00",
    retIvaEmitidas: "0.00",
    retIslrEmitidas: "0.00",
    cuotaPeriodo: "0.00",
    retRecibidasAplicadas: "0.00",
  };
  const summary: IvaSummary = viewing
    ? await getIvaSummary(
        { companyId: selected.id, userId: user.id },
        viewing.id
      )
    : ZERO;
  const conciliation = viewing
    ? await getConciliation(
        { companyId: selected.id, userId: user.id },
        viewing.id
      )
    : { ok: true, items: [] };
  const controls = viewing
    ? await getAutoControls(
        { companyId: selected.id, userId: user.id },
        viewing.id
      )
    : { ok: true, items: [] };
  const trend = (
    await Promise.all(
      periods.slice(-6).map(async (p) => ({
        id: p.id,
        label: periodLabel(p.range),
        ...(await getIvaSummary(
          { companyId: selected.id, userId: user.id },
          p.id
        )),
      }))
    )
  ).filter((t) => t.label !== "—");

  const indicators = [
    {
      icon: ReceiptLong,
      title: "Débito fiscal",
      sub: "Ventas del período",
      value: fmtVe(summary.debitoFiscal),
      href: `/c/${selected.id}/reportes/resumen-iva`,
    },
    {
      icon: Business,
      title: "Crédito fiscal",
      sub: "Compras del período",
      value: fmtVe(summary.creditoFiscal),
      href: `/c/${selected.id}/reportes/resumen-iva`,
    },
    {
      icon: Approval,
      title: "IVA retenido",
      sub: "Comprobantes emitidos",
      value: fmtVe(summary.retIvaEmitidas),
      href: `/c/${selected.id}/retenciones`,
    },
    {
      icon: Calculate,
      title: "Cuota del período",
      sub: "Débito menos crédito",
      value: fmtVe(summary.cuotaPeriodo),
      href: `/c/${selected.id}/reportes/resumen-iva`,
    },
        {
          icon: AttachMoney,
          title: "Ventas gravadas",
          sub: "Base imponible ventas",
          value: fmtVe(summary.ventasGravadas),
          href: `/c/${selected.id}/reportes/libro-ventas`,
        },
        {
          icon: Payments,
          title: "Compras gravadas",
          sub: "Base imponible compras",
          value: fmtVe(summary.comprasGravadas),
          href: `/c/${selected.id}/reportes/libro-compras`,
        },
        {
          icon: Gavel,
          title: "ISLR retenido",
          sub: "Comprobantes emitidos",
          value: fmtVe(summary.retIslrEmitidas),
          href: `/c/${selected.id}/retenciones-islr`,
        },
        {
          icon: FactCheck,
          title: "Retenido recibido",
          sub: "Aplicado al período",
          value: fmtVe(summary.retRecibidasAplicadas),
          href: `/c/${selected.id}/retenciones-recibidas`,
        },
  ];

  const donutData = [
    { label: "Ventas gravadas", value: Number(summary.ventasGravadas) },
    { label: "Ventas exentas", value: Number(summary.ventasExentas) },
    { label: "Compras gravadas", value: Number(summary.comprasGravadas) },
    { label: "Compras exentas", value: Number(summary.comprasExentas) },
  ];

  const chartData = trend.map((t) => ({
    label: t.label,
    debito: Number(t.debitoFiscal),
    credito: Number(t.creditoFiscal),
  }));
  const cuotaData = trend.map((t) => ({
    label: t.label,
    cuota: Number(t.cuotaPeriodo),
  }));
  const retencionesData = trend.map((t) => ({
    label: t.label,
    iva: Number(t.retIvaEmitidas),
    islr: Number(t.retIslrEmitidas),
  }));
  const hasTrend = trend.length > 0;
  const donutTotal = donutData.reduce((a, d) => a + d.value, 0);

  const concDiffs = conciliation.items.filter((i) => !i.ok);
  const pendingControls = controls.items.filter(
    (i) => i.hallazgos.length > 0
  );

  const comparison = await Promise.all(
    overviews.map(async ({ company: c, ctx: cctx }) => {
      const ps = [...(cctx?.periods ?? [])].sort((a, b) =>
        String(a.range).localeCompare(String(b.range))
      );
      const cur = ps.find((p) => p.status === "open") ?? ps[ps.length - 1];
      if (!cur)
        return {
          id: c.id,
          razonSocial: c.razonSocial,
          period: null as null | { label: string; status: string },
          cuota: null as string | null,
          debito: null as string | null,
          credito: null as string | null,
        };
      const s = await getIvaSummary(
        { companyId: c.id, userId: user.id },
        cur.id
      );
      return {
        id: c.id,
        razonSocial: c.razonSocial,
        period: { label: periodLabel(String(cur.range)), status: cur.status },
        cuota: fmtVe(s.cuotaPeriodo),
        debito: fmtVe(s.debitoFiscal),
        credito: fmtVe(s.creditoFiscal),
      };
    })
  );

  const VERBS: Record<string, string> = {
    create: "Registró",
    register: "Registró",
    update: "Actualizó",
    issue: "Emitió",
    void: "Anuló",
    supersede: "Sustituyó",
    confirm: "Confirmó",
    freeze: "Congeló",
    upload: "Subió",
    allocate: "Asignó",
    deliver: "Entregó",
    conciliate: "Concilió",
    apply: "Aplicó",
    config: "Configuró",
    configure: "Configuró",
    draft: "Registró borrador de",
  };
  const ENTITIES: Record<string, string> = {
    purchase_document: "compra",
    sales_document: "venta",
    iva_withholding: "retención IVA",
    islr_withholding: "retención ISLR",
    fiscal_period: "período",
    import_batch: "lote",
    payment: "pago",
    party: "tercero",
  };
  // Actividad solo de la empresa seleccionada (antes: todas × 500 filas).
  const activity = (
    await listAuditEvents(
      { companyId: selected.id, userId: user.id },
      { limit: 8 }
    )
  ).map((e) => ({ ...e, companyName: selected.razonSocial, companyId: selected.id }));

  // CTA de cierre: período abierto, conciliado y sin hallazgos.
  const readyToClose =
    viewing?.status === "open" &&
    concDiffs.length === 0 &&
    pendingControls.length === 0 &&
    (ctx.role === "contador");

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title="Panel general"
        user={user}
        companyCount={memberships.length}
        canManageUsers={canManageUsers}
      />

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {/* Selector compacto (el resumen domina; las tarjetas viven sin selección). */}
        <section className="pt-10" aria-label="Empresas">
          <div className="flex items-center gap-3">
            <CompanySwitch
              selectedId={selected.id}
              companies={overviews.map(({ company, ctx: cctx }): SwitchCompany => {
                const sortedP = [...(cctx?.periods ?? [])].sort((a, b) =>
                  String(a.range).localeCompare(String(b.range))
                );
                const cur =
                  sortedP.find((x) => x.status === "open") ??
                  sortedP[sortedP.length - 1];
                return {
                  id: company.id,
                  razonSocial: company.razonSocial,
                  rifOriginal: company.rifOriginal,
                  condicionIva: company.condicionIva,
                  logoUrl: company.logoUrl,
                  role: cctx?.role ?? null,
                  periodText: cur
                    ? `${periodLabel(String(cur.range))} · ${periodStatusVe(cur.status)}`
                    : null,
                };
              })}
            />
            <Link
              href={`/c/${selected.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-[#352574] hover:underline"
            >
              Entrar
              <ArrowForward className="h-4 w-4" aria-hidden />
            </Link>
            <span className="ms-auto shrink-0">
              <NewCompanyButton />
            </span>
          </div>
        </section>

        <section className="mt-10" aria-label="Resumen fiscal">
          <div
            className="rounded-lg border-2 bg-white p-5 shadow-sm"
            style={{ borderColor: selected.colorDistintivo ?? "#352574" }}
          >
          <Badge variant="outline" className="rounded-md px-3 py-1">
            Resumen fiscal
          </Badge>
          <div className="mt-3 flex items-center gap-4">
            {selected.logoUrl ? (
              <img
                src={selected.logoUrl}
                alt={`Logo de ${selected.razonSocial}`}
                className="h-14 w-14 shrink-0 rounded-md border border-periwinkle-200 bg-white object-contain p-1.5 shadow-sm"
              />
            ) : (
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-white shadow-sm"
                style={{ background: selected.colorDistintivo ?? "#120c27" }}
              >
                <Business className="h-6 w-6" aria-hidden />
              </span>
            )}
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {selected.razonSocial}
            </h1>
          </div>
          <p className="mt-2 text-sm text-periwinkle-500">
            Período {viewing ? periodLabel(String(viewing.range)) : "—"} ·{" "}
            {viewing ? periodStatusVe(viewing.status) : "sin períodos"}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {periods.length > 1 ? (
              <nav className="flex flex-wrap items-center gap-1.5" aria-label="Períodos">
                {[...periods]
                  .sort((a, b) =>
                    String(b.range).localeCompare(String(a.range))
                  )
                  .slice(0, 8)
                  .map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard?company=${selected.id}&period=${p.id}`}
                      aria-current={
                        viewing?.id === p.id ? "page" : undefined
                      }
                      className={cn(
                        "rounded-md px-3 py-1.5 font-mono text-xs tabular-nums transition-colors",
                        viewing?.id === p.id
                          ? "bg-[#120c27] text-white shadow-md shadow-[#120c27]/20"
                          : "border border-periwinkle-200 bg-white text-periwinkle-600 hover:bg-periwinkle-100 hover:text-[#120c27]"
                      )}
                    >
                      {periodLabel(String(p.range))}
                      {p.status !== "open" ? ` · ${periodStatusVe(p.status)}` : ""}
                    </Link>
                  ))}
                {periods.length > 8 && (
                  <Link
                    href={`/c/${selected.id}/periodos`}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-periwinkle-600 hover:text-[#120c27] hover:underline"
                  >
                    Ver los {periods.length} →
                  </Link>
                )}
              </nav>
            ) : (
              <span />
            )}
            {current && <QuickActions companyId={selected.id} canWrite={ctx.role === "administrativo" || ctx.role === "contador"} />}
          </div>
          </div>
        </section>

        {/* Alertas */}
        {(concDiffs.length > 0 || pendingControls.length > 0) && (
          <section className="mt-6" aria-label="Pendientes">
            <div className="grid gap-3 sm:grid-cols-2">
              {concDiffs.length > 0 && (
                <Link
                  href={`/c/${selected.id}/reportes/resumen-iva`}
                  className="group flex items-center gap-3 rounded-md border border-amber-600/30 bg-amber-100/60 px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <WarningAmber
                    className="h-5 w-5 shrink-0 text-amber-800"
                    aria-hidden
                  />
                  <span className="text-sm text-periwinkle-900">
                    <strong>
                      {concDiffs.length}{" "}
                      {concDiffs.length === 1 ? "diferencia" : "diferencias"}
                    </strong>{" "}
                    sin conciliar en este período. Revisar resumen →
                  </span>
                </Link>
              )}
              {pendingControls.length > 0 && (
                <Link
                  href={`/c/${selected.id}/periodos`}
                  className="group flex items-center gap-3 rounded-md border border-amber-600/30 bg-amber-100/60 px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <WarningAmber
                    className="h-5 w-5 shrink-0 text-amber-800"
                    aria-hidden
                  />
                  <span className="text-sm text-periwinkle-900">
                    <strong>
                      {pendingControls.reduce(
                        (a, i) => a + i.hallazgos.length,
                        0
                      )}{" "}
                      hallazgos
                    </strong>{" "}
                    en {pendingControls.length}{" "}
                    {pendingControls.length === 1 ? "control" : "controles"}{" "}
                    previos al cierre. Ver períodos →
                  </span>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Listo para revisión: abierto, conciliado y sin hallazgos. */}
        {readyToClose && (
          <section className="mt-6" aria-label="Listo para revisión">
            <Link
              href={`/c/${selected.id}/periodos`}
              className="group flex items-center gap-3 rounded-md border border-icy-aqua-600/30 bg-icy-aqua-50/70 px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CheckCircle
                className="h-5 w-5 shrink-0 text-icy-aqua-700"
                aria-hidden
              />
              <span className="text-sm text-periwinkle-900">
                <strong>Todo cuadra.</strong> Envía el período{" "}
                {viewing ? periodLabel(String(viewing.range)) : ""} a revisión
                para cerrar →
              </span>
            </Link>
          </section>
        )}

        {!current && (
          <Card className="mt-8 rounded-lg border-icy-aqua-200 bg-gradient-to-r from-icy-aqua-50/60 to-white">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm leading-relaxed text-periwinkle-600">
                Sin movimientos todavía: registra tu primera compra o venta
                y el período se crea solo. Los indicadores muestran 0,00.
              </p>
              <QuickActions companyId={selected.id} canWrite={ctx.role === "administrativo" || ctx.role === "contador"} />
            </CardContent>
          </Card>
        )}
            {/* Indicadores */}
            <section className="mt-8" aria-label="Indicadores del período">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {indicators.map((k, i) => (
                  <Reveal key={k.title} delay={i * 80} className="h-full">
                    <Link
                      href={k.href}
                      aria-label={`${k.title}: ${k.value}. Ver detalle`}
                      className="block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
                    >
                    <Card className="h-full rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                          <k.icon className="h-4.5 w-4.5" aria-hidden />
                        </span>
                        <div>
                          <CardTitle className="text-sm tracking-tight">
                            {k.title}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {k.sub}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                          {k.value}
                        </p>
                      </CardContent>
                    </Card>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* Gráficos */}
            {!hasTrend ? (
              <section className="mt-3" aria-label="Gráficos">
                <Card className="rounded-lg border-icy-aqua-200 bg-gradient-to-r from-icy-aqua-50/60 to-white">
                  <CardContent className="p-5 text-sm leading-relaxed text-periwinkle-600">
                    Aún no hay períodos con movimientos para graficar. Registra
                    documentos y la tendencia débito vs crédito aparecerá aquí.
                  </CardContent>
                </Card>
              </section>
            ) : (
            <section className="mt-3" aria-label="Gráficos">
              <div className="grid gap-3 lg:grid-cols-3">
                <Reveal className="lg:col-span-2">
                <Card className="h-full rounded-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base tracking-tight">
                      Débito vs crédito fiscal
                    </CardTitle>
                    <CardDescription>
                      Últimos {trend.length} períodos · base imponible del IVA
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TrendChart data={chartData} />
                  </CardContent>
                </Card>
                </Reveal>
                <Reveal delay={100}>
                <Card className="h-full rounded-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base tracking-tight">
                      Base imponible
                    </CardTitle>
                    <CardDescription>
                      Gravada vs exenta del período
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {donutTotal > 0 ? (
                      <CompositionDonut data={donutData} />
                    ) : (
                      <p className="py-8 text-center text-sm text-periwinkle-500">
                        Sin base imponible en este período.
                      </p>
                    )}
                  </CardContent>
                </Card>
                </Reveal>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <Reveal>
                <Card className="h-full rounded-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base tracking-tight">
                      Cuota del período
                    </CardTitle>
                    <CardDescription>
                      Tendencia de los últimos {trend.length} períodos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CuotaChart data={cuotaData} />
                  </CardContent>
                </Card>
                </Reveal>
                <Reveal delay={100}>
                <Card className="h-full rounded-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base tracking-tight">
                      Retenciones emitidas
                    </CardTitle>
                    <CardDescription>
                      IVA vs ISLR por período
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RetencionesChart data={retencionesData} />
                  </CardContent>
                </Card>
                </Reveal>
              </div>
            </section>
            )}

            {/* Comparativa */}
            {comparison.length > 1 && (
              <section className="mt-3" aria-label="Comparativa entre empresas">
                <Reveal>
                <Card className="overflow-hidden rounded-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base tracking-tight">
                      Comparativa entre empresas
                    </CardTitle>
                    <CardDescription>
                      Período actual de cada empresa · montos en formato es-VE
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-periwinkle-200 text-left text-xs uppercase tracking-wider text-periwinkle-500">
                          <th className="px-3 py-2 font-semibold">Empresa</th>
                          <th className="px-3 py-2 font-semibold">Período</th>
                          <th className="px-3 py-2 text-right font-semibold">Débito</th>
                          <th className="px-3 py-2 text-right font-semibold">Crédito</th>
                          <th className="px-3 py-2 text-right font-semibold">Cuota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-periwinkle-100">
                        {comparison.map((row) => (
                          <tr
                            key={row.id}
                            className={
                              row.id === selected.id
                                ? "bg-periwinkle-50/70"
                                : "transition-colors hover:bg-periwinkle-50/60"
                            }
                          >
                            <td className="px-3 py-2.5">
                              <Link
                                href={`/dashboard?company=${row.id}`}
                                className="font-medium text-[#120c27] hover:underline"
                              >
                                {row.razonSocial}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-periwinkle-500">
                              {row.period
                                ? `${row.period.label} · ${periodStatusVe(row.period.status)}`
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                              {row.debito ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                              {row.credito ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                              {row.cuota ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                </Reveal>
              </section>
            )}

            {/* Actividad reciente */}
            {activity.length > 0 && (
              <section className="mt-3" aria-label="Actividad reciente">
                <Reveal>
                <Card className="rounded-lg">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <History className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <div>
                      <CardTitle className="text-base tracking-tight">
                        Actividad reciente
                      </CardTitle>
                      <CardDescription>
                        Últimos movimientos de la bitácora
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-periwinkle-100 text-sm">
                      {activity.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-baseline justify-between gap-3 py-2"
                        >
                          <span className="min-w-0 truncate text-periwinkle-700">
                            <strong className="font-medium text-periwinkle-900">
                              {VERBS[e.action] ?? e.action}
                            </strong>{" "}
                            {ENTITIES[e.entityType] ?? e.entityType}
                            {overviews.length > 1 && (
                              <span className="text-periwinkle-400">
                                {" "}
                                · {e.companyName}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-periwinkle-400">
                            {fmtDateTime(e.occurredAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                </Reveal>
              </section>
            )}

            {/* Detalles */}
            <section className="mt-3" aria-label="Detalles">
              <Reveal>
                <Card className="rounded-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base tracking-tight">
                      Conciliación
                    </CardTitle>
                    <CardDescription>
                      Libros ↔ resumen ↔ comprobantes · tolerancia 0,01 ·{" "}
                      {conciliation?.ok
                        ? "todo cuadra"
                        : "hay diferencias"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-2 text-sm sm:grid-cols-2">
                      {conciliation?.items.map((it) => (
                        <li
                          key={it.nombre}
                          className="flex items-center justify-between gap-3 rounded-md border border-periwinkle-100 bg-periwinkle-50/60 px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-periwinkle-700">
                            {it.ok ? (
                              <CheckCircle
                                className="h-4 w-4 shrink-0 text-icy-aqua-700"
                                aria-hidden
                              />
                            ) : (
                              <Close
                                className="h-4 w-4 shrink-0 text-red-800"
                                aria-hidden
                              />
                            )}
                            <span className="truncate">{it.nombre}</span>
                          </span>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-periwinkle-500">
                            {fmtVe(it.esperado)} · {fmtVe(it.real)}
                          </span>
                        </li>
                      )) ?? (
                        <li className="text-periwinkle-500">
                          Sin conciliación para este período.
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
            </section>
      </main>

      <PageFooter context="Panel general" />
    </div>
  );
}
