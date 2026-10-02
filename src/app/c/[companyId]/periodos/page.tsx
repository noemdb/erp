import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowForward from "@mui/icons-material/ArrowForward";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import Lock from "@mui/icons-material/Lock";
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
import { getCompanyContext } from "@/modules/tenancy/repo";
import { authorize } from "@/modules/tenancy/authorize";
import { listPeriods } from "@/modules/periods/service";
import { CreatePeriodDialog } from "./create-period-dialog";

const statusMeta: Record<
  string,
  { label: string; variant: "success" | "warning" | "muted" | "outline" }
> = {
  open: { label: "Abierto", variant: "success" },
  under_review: { label: "En revisión", variant: "warning" },
  closed: { label: "Cerrado", variant: "muted" },
  reopened: { label: "Reabierto", variant: "outline" },
};

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

export default async function PeriodosPage({
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

  const rows = await listPeriods({ companyId, userId: user.id });
  const auth = await authorize(companyId, user.id, "periods.close");
  const canManage = auth.ok;
  const defaultKind =
    ctx.company?.periodKind === "biweekly" ? "biweekly" : "monthly";
  const sorted = [...rows].sort((a, b) =>
    String(b.range ?? "").localeCompare(String(a.range ?? "")),
  );

  const open = sorted.filter((r) => r.status === "open").length;
  const review = sorted.filter((r) => r.status === "under_review").length;
  const closed = sorted.filter((r) =>
    ["closed", "reopened"].includes(r.status ?? ""),
  ).length;

  const kpis = [
    { label: "Períodos", value: String(sorted.length), mono: true },
    { label: "Abiertos", value: String(open), mono: true },
    { label: "En revisión", value: String(review), mono: true },
    { label: "Cerrados / reabiertos", value: String(closed), mono: true },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Períodos · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
            {canManage && (
              <div className="mt-4 sm:absolute sm:right-0 sm:top-0 sm:mt-0">
                <CreatePeriodDialog
                  companyId={companyId}
                  defaultKind={defaultKind}
                />
              </div>
            )}
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Control y cierre · Períodos fiscales
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Períodos fiscales
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
              Cada período consolida libros, resumen y comprobantes. El cierre
              congela con <span className="font-mono">closure_hash</span>; lo
              cerrado no se edita: se reabre con motivo o se ajusta en un
              período abierto.
            </p>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Estado de períodos">
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

        {/* Máquina de estados */}
        <section className="mt-8" aria-label="Cómo funciona el cierre">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#120c27] text-white">
                    <Lock className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-sm text-periwinkle-700">
                    <span className="font-mono font-semibold text-[#120c27]">
                      abierto → en revisión → cerrado → reabierto
                    </span>
                    <br />
                    <span className="text-periwinkle-500">
                      Solo el contador cierra o reabre. El cierre exige
                      checklist sin bloqueos y deja auditoría con responsable.
                    </span>
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {ctx.company?.periodKind === "biweekly"
                    ? "Quincenal por empresa"
                    : "Mensual por empresa"}
                </Badge>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Tabla */}
        <section className="mt-8" aria-label="Lista de períodos">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Períodos de la empresa
                </CardTitle>
                <CardDescription>
                  {sorted.length === 0
                    ? "Aún no hay períodos. Se crean al registrar documentos con su fecha fiscal."
                    : `${sorted.length} ${sorted.length === 1 ? "período" : "períodos"} ordenados del más reciente al más antiguo.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <CalendarMonth className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      Registra una compra o venta con su fecha fiscal y el
                      período se creará automáticamente.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">
                            Período
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Tipo
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Estado
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Hash de cierre
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Cerrado el
                          </th>
                          <th scope="col" className="px-4 py-3 text-right">
                            Detalle
                          </th>
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
                              <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                                <Link
                                  href={`${base}/periodos/${r.id}`}
                                  className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                                >
                                  {formatRange(r.range)}
                                </Link>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-periwinkle-500">
                                {r.kind === "biweekly"
                                  ? "Quincenal"
                                  : r.kind === "monthly"
                                    ? "Mensual"
                                    : (r.kind ?? "—")}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant={st.variant}>{st.label}</Badge>
                              </td>
                              <td
                                className="max-w-40 truncate px-4 py-3 font-mono text-xs text-periwinkle-500"
                                title={r.closureHash ?? "Sin hash de cierre"}
                              >
                                {r.closureHash
                                  ? `${r.closureHash.slice(0, 12)}…`
                                  : "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums">
                                {formatDateTime(r.closedAt)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <Link
                                  href={`${base}/periodos/${r.id}`}
                                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#120c27] transition-colors hover:bg-periwinkle-100"
                                  aria-label={`Ver detalle del período ${formatRange(r.range)}`}
                                >
                                  Ver
                                  <ArrowForward
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                  />
                                </Link>
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

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
