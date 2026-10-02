import Link from "next/link";
import { redirect } from "next/navigation";
import Download from "@mui/icons-material/Download";
import FilterList from "@mui/icons-material/FilterList";
import History from "@mui/icons-material/History";
import Lock from "@mui/icons-material/Lock";
import Timeline from "@mui/icons-material/Timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { authorize } from "@/modules/tenancy/authorize";
import { documentTimeline, listAuditEvents } from "@/modules/audit/queries";

const ENTITY_TYPES = [
  "purchase_document",
  "sales_document",
  "iva_withholding",
  "islr_withholding",
  "fiscal_period",
  "import_batch",
  "payment",
  "party",
  "withholding_rule",
  "company",
] as const;

const ENTITY_LABELS: Record<string, string> = {
  purchase_document: "Compra",
  sales_document: "Venta",
  iva_withholding: "Retención IVA",
  islr_withholding: "Retención ISLR",
  fiscal_period: "Período",
  import_batch: "Lote",
  payment: "Pago",
  party: "Tercero",
  withholding_rule: "Regla",
  company: "Empresa",
};

const ACTIONS = [
  "create",
  "update",
  "void",
  "issue",
  "deliver",
  "close",
  "reopen",
  "config",
  "approve",
  "confirm",
] as const;

function actionVariant(action: string): "success" | "warning" | "destructive" | "secondary" | "outline" {
  if (action === "issue" || action === "close" || action === "approve") return "success";
  if (action === "void" || action === "reopen") return "destructive";
  if (action === "update" || action === "config") return "warning";
  if (action === "create" || action === "confirm") return "secondary";
  return "outline";
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

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export default async function AuditoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const auth = await authorize(companyId, user.id, "audit.read");
  const canRead = auth.ok;
  if (!canRead) redirect(base);

  const entityType = sp.entityType?.trim() || undefined;
  const entityId = sp.entityId?.trim() || undefined;
  const action = sp.action?.trim() || undefined;
  const from = sp.from?.trim() || undefined;
  const to = sp.to?.trim() || undefined;

  const rows = await listAuditEvents(
    { companyId, userId: user.id },
    { entityType, entityId, action, from, to },
  );

  const timeline =
    entityType === "purchase_document" && entityId
      ? await documentTimeline({ companyId, userId: user.id }, entityId)
      : null;

  const q = new URLSearchParams({
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(action ? { action } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();

  const kpis = [
    { label: "Eventos (máx. 500)", value: String(rows.length) },
    {
      label: "Acciones distintas",
      value: String(new Set(rows.map((r) => r.action)).size),
    },
    {
      label: "Entidades distintas",
      value: String(new Set(rows.map((r) => r.entityType)).size),
    },
    {
      label: "Con motivo",
      value: String(rows.filter((r) => r.reason).length),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Bitácora · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
            <div className="mt-4 sm:absolute sm:right-0 sm:top-0 sm:mt-0">
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/companies/${companyId}/audit/export${q ? `?${q}` : ""}`}>
                  <Download aria-hidden />
                  Exportar CSV
                </Link>
              </Button>
            </div>
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Trazabilidad · Bitácora append-only
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Bitácora de auditoría
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
              Quién, cuándo, qué entidad, valores previos y nuevos, motivo y
              transacción. Cada evento se escribe en la misma transacción que el
              cambio y no se puede editar ni borrar.
            </p>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Resumen de la bitácora">
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

        {/* Garantía append-only */}
        <section className="mt-8" aria-label="Garantía de inmutabilidad">
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
                    <span className="font-semibold text-[#120c27]">
                      Solo lectura · append-only en base de datos
                    </span>
                    <br />
                    <span className="text-periwinkle-500">
                      Rol {ctx.role} · la bitácora cubre compras, ventas,
                      retenciones, períodos, importaciones y configuración.
                    </span>
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  Responde “¿de dónde salió?” en ≤ 3 clics
                </Badge>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Línea de tiempo por documento */}
        {timeline && (
          <section className="mt-8" aria-label="Línea de tiempo del documento">
            <Reveal>
              <Card className="overflow-hidden rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                    <Timeline className="h-4 w-4" aria-hidden />
                    Línea de tiempo · {timeline.doc.docNumber}
                  </CardTitle>
                  <CardDescription>
                    Estado {timeline.doc.status} ·{" "}
                    {timeline.origin
                      ? `origen lote ${shortId(timeline.origin.batchId)} · fila ${timeline.origin.row ?? "—"}`
                      : "registro manual sin lote de importación"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ol className="space-y-3">
                    {timeline.events.map((e) => (
                      <li key={e.id} className="flex items-start gap-3 rounded-md border border-periwinkle-100 bg-periwinkle-50/50 p-3">
                        <Badge variant={actionVariant(e.action)}>{e.action}</Badge>
                        <div className="min-w-0">
                          <p className="font-mono text-xs tabular-nums">{formatDateTime(e.occurredAt)}</p>
                          <p className="truncate text-sm text-periwinkle-700">
                            {e.reason ?? "Sin motivo registrado"}
                          </p>
                        </div>
                      </li>
                    ))}
                    {timeline.events.length === 0 && (
                      <li className="text-sm text-periwinkle-500">
                        Sin eventos para este documento en esta empresa.
                      </li>
                    )}
                  </ol>
                </CardContent>
              </Card>
            </Reveal>
          </section>
        )}

        {/* Filtros */}
        <section className="mt-8" aria-label="Filtros de la bitácora">
          <Reveal>
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                  <FilterList className="h-4 w-4" aria-hidden />
                  Filtros
                </CardTitle>
                <CardDescription>
                  Filtra por entidad, acción y rango de fechas. El detalle por
                  documento muestra su origen de importación.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form method="GET" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="entityType">Tipo de entidad</Label>
                    <select
                      id="entityType"
                      name="entityType"
                      defaultValue={entityType ?? ""}
                      className="flex h-9 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30"
                    >
                      <option value="">Todas</option>
                      {ENTITY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {ENTITY_LABELS[t] ?? t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="action">Acción</Label>
                    <select
                      id="action"
                      name="action"
                      defaultValue={action ?? ""}
                      className="flex h-9 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30"
                    >
                      <option value="">Todas</option>
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="entityId">ID de entidad</Label>
                    <Input
                      id="entityId"
                      name="entityId"
                      placeholder="UUID del documento…"
                      defaultValue={entityId ?? ""}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="from">Desde</Label>
                    <Input id="from" name="from" type="date" defaultValue={from ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="to">Hasta</Label>
                    <Input id="to" name="to" type="date" defaultValue={to ?? ""} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" size="sm">
                      Filtrar
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={base + "/auditoria"}>Limpiar</Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Tabla */}
        <section className="mt-8" aria-label="Eventos de auditoría">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                  <History className="h-4 w-4" aria-hidden />
                  Eventos
                </CardTitle>
                <CardDescription>
                  {rows.length === 0
                    ? "Sin eventos para los filtros aplicados."
                    : `${rows.length} evento${rows.length === 1 ? "" : "s"} (límite 500, del más reciente al más antiguo).`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <History className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      Ajusta los filtros o revisa otra entidad para trazar su
                      historia completa.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link href={base + "/auditoria"}>Ver toda la bitácora</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[56rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Cuándo</th>
                          <th scope="col" className="px-4 py-3">Acción</th>
                          <th scope="col" className="px-4 py-3">Entidad</th>
                          <th scope="col" className="px-4 py-3">Actor</th>
                          <th scope="col" className="px-4 py-3">Motivo</th>
                          <th scope="col" className="px-4 py-3 text-right">Transacción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums">
                              {formatDateTime(r.occurredAt)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <Badge variant={actionVariant(r.action)}>{r.action}</Badge>
                            </td>
                            <td className="max-w-56 px-4 py-3">
                              <span className="block truncate text-periwinkle-700">
                                <Badge variant="outline" className="mr-1.5">
                                  {ENTITY_LABELS[r.entityType] ?? r.entityType}
                                </Badge>
                                <span className="font-mono text-xs" title={r.entityId}>
                                  {shortId(r.entityId)}
                                </span>
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-periwinkle-500" title={r.actorUserId ?? "sistema"}>
                              {r.actorUserId ? shortId(r.actorUserId) : "sistema"}
                            </td>
                            <td className="max-w-64 truncate px-4 py-3 text-periwinkle-700" title={r.reason ?? ""}>
                              {r.reason ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-periwinkle-500" title={r.txId}>
                              {shortId(r.txId)}
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

        <p className="mt-6 text-xs text-periwinkle-500">
          Exportación en CSV con los mismos filtros · valores neutralizados
          contra inyección de fórmulas · descarga como adjunto.
        </p>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
