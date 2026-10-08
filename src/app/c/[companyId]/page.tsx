import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Approval from "@mui/icons-material/Approval";
import Business from "@mui/icons-material/Business";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import CloudUpload from "@mui/icons-material/CloudUpload";
import VerifiedUser from "@mui/icons-material/VerifiedUser";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter, safeAccent } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";

const periodStatus: Record<string, { label: string; variant: "success" | "warning" | "muted" | "outline" }> = {
  open: { label: "Abierto", variant: "success" },
  under_review: { label: "En revisión", variant: "warning" },
  closed: { label: "Cerrado", variant: "muted" },
  reopened: { label: "Reabierto", variant: "outline" },
};

function formatRange(range: unknown): string {
  if (typeof range !== "string") return "—";
  const m = range.replace(/[[)()]/g, "").split(",");
  if (m.length !== 2 || !m[0] || !m[1]) return range;
  const fmt = (iso: string) => {
    const [y, mo, d] = iso.split("-");
    return `${d}-${mo}-${y}`;
  };
  return `${fmt(m[0])} → ${fmt(m[1])}`;
}

export default async function CompanyDashboard({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const base = `/c/${companyId}`;
  // Con una sola empresa no hay a dónde volver: /companies redirige aquí.
  const memberships = await listMemberships(user.id);

  const categories: {
    icon: typeof CloudUpload;
    title: string;
    text: string;
    links: [string, string][];
  }[] = [
    {
      icon: CloudUpload,
      title: "Registrar",
      text: "El documento fiscal se registra una sola vez.",
      links: [
        ["Compras", `${base}/compras`],
        ["Ventas", `${base}/ventas`],
        ["Pagos", `${base}/pagos`],
      ],
    },
    {
      icon: Approval,
      title: "Comprobantes",
      text: "Retenciones multi-factura con número correlativo.",
      links: [
        ["Retenciones IVA", `${base}/retenciones`],
        ["Retenciones ISLR", `${base}/retenciones-islr`],
        ["Recibidas", `${base}/retenciones-recibidas`],
      ],
    },
    {
      icon: Business,
      title: "Datos base",
      text: "Terceros y carga inicial por lotes.",
      links: [
        ["Terceros", `${base}/terceros`],
        ["Importaciones", `${base}/importaciones`],
        ["Reglas", `${base}/reglas`],
        ["Decisiones", `${base}/decisiones`],
        ["Dorados", `${base}/dorados`],
        ["Configuración", `${base}/configuracion`],
        ["Plazos", `${base}/plazos`],
      ],
    },
    {
      icon: VerifiedUser,
      title: "Control y reportes",
      text: "Libros, resumen, períodos y bitácora.",
      links: [
        ["Períodos", `${base}/periodos`],
        ["Libro de Compras", `${base}/reportes/libro-compras`],
        ["Libro de Ventas", `${base}/reportes/libro-ventas`],
        ["Resumen IVA", `${base}/reportes/resumen-iva`],
        ["Bitácora", `${base}/auditoria`],
      ],
    },
  ];

  const current = ctx.periods[0];
  const st = (current?.status ? periodStatus[current.status] : undefined) ?? {
    label: "Sin período",
    variant: "outline" as const,
  };
  const accent = safeAccent(ctx.company?.colorDistintivo ?? null);

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={ctx.company?.razonSocial ?? "Empresa"}
        back={{ href: "/dashboard", label: "Dashboard" }}
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
              Panel de empresa
            </Badge>
            <div className="mt-3 flex items-center gap-4">
              {ctx.company?.logoUrl ? (
                <img
                  src={ctx.company.logoUrl}
                  alt={`Logo de ${ctx.company?.razonSocial ?? "la empresa"}`}
                  className="h-14 w-14 shrink-0 rounded-md border border-periwinkle-200 bg-white object-contain p-1.5 shadow-sm"
                />
              ) : (
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-white shadow-sm"
                  style={{ background: accent ?? "#120c27" }}
                >
                  <Business className="h-6 w-6" aria-hidden />
                </span>
              )}
              <h1 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {ctx.company?.razonSocial ?? "Empresa"}
              </h1>
            </div>
            <p className="mt-2 text-sm text-periwinkle-500">
              RIF {ctx.company?.rifOriginal ?? "—"} ·{" "}
              {ctx.company?.condicionIva ?? "—"}
              {ctx.company?.agenteRetencionIva ? " · Agente de retención IVA" : ""}
              {ctx.company?.agenteRetencionIslr ? " · Agente de retención ISLR" : ""}
            </p>
          </div>
        </section>

        {/* Período actual */}
        <section className="mt-8" aria-label="Período fiscal actual">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                style={
                  accent
                    ? {
                        background: `linear-gradient(to right, ${accent}, #352574 55%, #37c8a1)`,
                      }
                    : undefined
                }
                aria-hidden
              />
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#120c27] text-white">
                    <CalendarMonth className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
                      Período fiscal actual
                    </p>
                    <p className="mt-0.5 font-mono text-sm tabular-nums">
                      {current ? formatRange(current.range) : "Sin períodos abiertos"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <Link
                    href={`${base}/periodos`}
                    className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-[#120c27] transition-colors hover:bg-periwinkle-100"
                  >
                    Ver períodos
                    <ArrowForward className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Módulos */}
        <section className="mt-8" aria-label="Módulos">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((c, i) => (
              <Reveal key={c.title} delay={(i % 4) * 80} className="h-full">
                <Card className="group flex h-full flex-col rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27] transition-colors duration-300 group-hover:bg-[#120c27] group-hover:text-white">
                      <c.icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <div>
                      <CardTitle className="text-base tracking-tight">
                        {c.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <CardDescription>{c.text}</CardDescription>
                    <nav className="mt-3 space-y-0.5" aria-label={c.title}>
                      {c.links.map(([label, href]) => (
                        <Link
                          key={href}
                          href={href}
                          className="group/link flex items-center justify-between rounded-md px-2.5 py-2 text-sm text-periwinkle-700 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]"
                        >
                          {label}
                          <ArrowForward
                            className="h-3.5 w-3.5 text-periwinkle-300 transition-all group-hover/link:translate-x-0.5 group-hover/link:text-[#120c27]"
                            aria-hidden
                          />
                        </Link>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
