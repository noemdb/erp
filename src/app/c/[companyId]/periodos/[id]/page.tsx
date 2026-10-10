import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Cancel from "@mui/icons-material/Cancel";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Warning from "@mui/icons-material/Warning";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Lock from "@mui/icons-material/Lock";
import MenuBook from "@mui/icons-material/MenuBook";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
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
import { getCloseChecklist } from "@/modules/periods/checklist";
import { PeriodButtons } from "../../periodos/period-buttons";

const statusMeta: Record<
  string,
  { label: string; variant: "success" | "warning" | "muted" | "outline" }
> = {
  open: { label: "Abierto", variant: "success" },
  under_review: { label: "En revisión", variant: "warning" },
  closed: { label: "Cerrado", variant: "muted" },
  reopened: { label: "Reabierto", variant: "outline" },
};

const nextStep: Record<string, string> = {
  open: "Envía a revisión cuando termines de registrar documentos del período.",
  under_review:
    "Revisa el checklist: cierra si no hay bloqueos o devuelve a abierto con motivo.",
  closed:
    "Período inmutable: no admite ediciones. Solo se reabre con motivo y responsable, o se corrige con ajuste en un período abierto.",
  reopened:
    "Período reabierto para corregir: vuelve a enviar a revisión y cierra de nuevo.",
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

export default async function PeriodoDetallePage({
  params,
}: {
  params: Promise<{ companyId: string; id: string }>;
}) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const c = { companyId, userId: user.id };
  const periods = await listPeriods(c);
  const per = periods.find((p) => p.id === id);
  if (!per) redirect(`${base}/periodos`);
  const check = await getCloseChecklist(c, id);
  const auth = await authorize(companyId, user.id, "periods.close");
  const canManage = auth.ok;

  const st = statusMeta[per.status ?? ""] ?? {
    label: per.status ?? "—",
    variant: "outline" as const,
  };
  const blocking = check.items.filter((i) => i.bloqueante && !i.ok);
  const recommended = check.items.filter((i) => !i.bloqueante && !i.ok);
  const okCount = check.items.filter((i) => i.ok).length;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Período · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/periodos`, label: "Períodos" }}
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
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="rounded-md px-3 py-1">
                Período fiscal ·{" "}
                {per.kind === "biweekly" ? "Quincenal" : "Mensual"}
              </Badge>
              <h1 className="mt-3 font-mono text-balance text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                {formatRange(per.range)}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={st.variant}>{st.label}</Badge>
                <Badge variant={check.ready ? "success" : "warning"}>
                  Checklist {check.ready ? "listo" : "pendiente"} · {okCount}/
                  {check.items.length}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={`${base}/reportes/resumen-iva/${per.id}`}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-periwinkle-300 bg-white px-5 text-sm font-medium text-[#120c27] transition-colors hover:bg-periwinkle-50 h-9"
              >
                <ReceiptLong aria-hidden style={{ fontSize: 16 }} />
                Resumen IVA
              </Link>
              <Link
                href={`${base}/reportes/libro-compras`}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-[#120c27] px-5 text-sm font-medium text-white transition-colors hover:bg-[#352574] h-9"
              >
                <MenuBook aria-hidden style={{ fontSize: 16 }} />
                Libros
              </Link>
              <a
                href={`/api/companies/${companyId}/reports/closing-package?periodId=${per.id}`}
                download={`paquete-cierre-${per.id}.json`}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-periwinkle-300 bg-white px-5 text-sm font-medium text-[#120c27] transition-colors hover:bg-periwinkle-50 h-9"
              >
                <ArrowForward aria-hidden style={{ fontSize: 16 }} />
                Paquete (JSON)
              </a>
            </div>
          </div>
        </section>

        {/* Siguiente paso */}
        <section className="mt-8" aria-label="Siguiente paso">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardContent className="flex items-start gap-3 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                  <Lock className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm text-periwinkle-700">
                  <span className="font-semibold text-[#120c27]">
                    Siguiente paso:{" "}
                  </span>
                  {nextStep[per.status ?? ""] ?? "—"}
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Ficha */}
          <Reveal className="h-full">
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Ficha del período
                </CardTitle>
                <CardDescription>
                  Datos que determinan libros, resumen y comprobantes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-periwinkle-100 text-sm">
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Rango fiscal</dt>
                    <dd className="font-mono tabular-nums">
                      {formatRange(per.range)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Tipo</dt>
                    <dd>
                      {per.kind === "biweekly" ? "Quincenal" : "Mensual"}{" "}
                      <span className="font-mono text-xs text-periwinkle-500">
                        ({per.kind})
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Estado</dt>
                    <dd>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Hash de cierre</dt>
                    <dd
                      className="max-w-56 truncate font-mono text-xs"
                      title={per.closureHash ?? "Sin hash de cierre"}
                    >
                      {per.closureHash ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Cerrado el</dt>
                    <dd className="font-mono text-xs tabular-nums">
                      {formatDateTime(per.closedAt)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Motivo reapertura</dt>
                    <dd className="max-w-56 truncate" title={per.reopenReason ?? ""}>
                      {per.reopenReason ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Reabierto el</dt>
                    <dd className="font-mono text-xs tabular-nums">
                      {formatDateTime(per.reopenedAt)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </Reveal>

          {/* Checklist */}
          <Reveal className="h-full" delay={80}>
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Checklist de cierre
                </CardTitle>
                <CardDescription>
                  {blocking.length === 0
                    ? "Sin bloqueos: el período puede cerrarse."
                    : `${blocking.length} ${blocking.length === 1 ? "bloqueo" : "bloqueos"} impiden el cierre.`}
                  {recommended.length > 0 &&
                    ` ${recommended.length} recomendación(es) pendiente(s).`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {check.items.map((i) => (
                    <li
                      key={i.key}
                      className="flex items-start gap-3 rounded-md border border-periwinkle-100 px-3 py-2.5"
                    >
                      {i.ok ? (
                        <CheckCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-icy-aqua-700"
                          aria-hidden
                        />
                      ) : i.bloqueante ? (
                        <Cancel
                          className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                          aria-hidden
                        />
                      ) : (
                        <Warning
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{i.detalle}</p>
                        <p className="text-xs text-periwinkle-500">
                          {i.bloqueante ? "Bloqueante" : "Recomendado"} ·{" "}
                          {i.key}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Acciones */}
        <section className="mt-8" aria-label="Acciones del período">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Acciones
                </CardTitle>
                <CardDescription>
                  Solo el contador puede enviar a revisión, cerrar, devolver o
                  reabrir. Cada cambio queda en bitácora con responsable.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PeriodButtons
                  companyId={companyId}
                  periodId={id}
                  status={per.status ?? ""}
                  canManage={canManage}
                />
                {!canManage && (
                  <p className="mt-3 flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    <InfoOutlined
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden
                    />
                    Tu rol ({ctx.role}) es de solo lectura aquí. Pide a un
                    contador que ejecute la transición.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link
            href={`${base}/periodos`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver a períodos
            <ArrowForward
              className="hidden"
              aria-hidden
            />
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
