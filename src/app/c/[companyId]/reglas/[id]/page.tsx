import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
import History from "@mui/icons-material/History";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
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
import { listAuditEvents } from "@/modules/audit/queries";
import { getRule } from "@/modules/rules/service";
import {
  RULE_KIND_ES,
  RULE_STATUS_ES,
  RULE_STATUS_VARIANT,
  es,
  fmtPorcentaje,
  fmtRange,
} from "@/modules/rules/labels";
import { RuleFlowButtons } from "./flow-buttons";

const NEXT_STEP: Record<string, string> = {
  draft: "Revisa los parámetros y envía a revisión.",
  in_review: "Verifica fuente normativa y ejemplo numérico antes de aprobar.",
  approved: "Al activar se trunca la vigencia activa anterior: verifica la fecha.",
  active: "Versión en uso por el motor. No se edita: crea un borrador nuevo para cambiarla.",
  superseded: "Versión histórica reemplazada. Solo lectura.",
};

function fmtDateTime(v: unknown): string {
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

export default async function ReglaDetallePage({
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
  const data = await getRule(c, id);
  if (!data) redirect(`${base}/reglas`);
  const { rule: r, concept } = data;
  const trail = await listAuditEvents(c, { entityType: "withholding_rule", entityId: id });
  const canEdit = (await authorize(companyId, user.id, "rules.edit")).ok;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Reglas · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/reglas`, label: "Reglas" }}
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
              Regla {es(RULE_KIND_ES, r.ruleKind)}
              {concept ? ` · ${concept.codigo}` : ""}
            </Badge>
            <h1 className="mt-3 font-mono text-balance text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              {fmtPorcentaje(r.porcentaje)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={RULE_STATUS_VARIANT[r.status ?? ""] ?? "outline"}>
                {es(RULE_STATUS_ES, r.status)}
              </Badge>
              <span className="text-sm text-periwinkle-500">
                {NEXT_STEP[r.status ?? ""] ?? ""}
              </span>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Ficha */}
          <Reveal className="h-full">
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Parámetros versionados
                </CardTitle>
                <CardDescription>
                  Snapshot de lo que el motor guarda al calcular.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-periwinkle-100 text-sm">
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Tipo</dt>
                    <dd>{es(RULE_KIND_ES, r.ruleKind)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Concepto</dt>
                    <dd>{concept ? `${concept.codigo} · ${concept.nombre}` : "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Porcentaje</dt>
                    <dd className="font-mono tabular-nums">{fmtPorcentaje(r.porcentaje)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Sustraendo</dt>
                    <dd className="font-mono tabular-nums">{r.sustraendo}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Base</dt>
                    <dd className="font-mono text-xs">{r.baseFormulaKind}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Vigencia</dt>
                    <dd className="font-mono text-xs tabular-nums">{fmtRange(r.effectiveRange)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Fuente</dt>
                    <dd className="max-w-56 truncate" title={r.legalReference ?? ""}>
                      {r.legalReference ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Motivo</dt>
                    <dd className="max-w-56 truncate" title={r.changeReason ?? ""}>
                      {r.changeReason ?? "—"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </Reveal>

          {/* Flujo */}
          <Reveal className="h-full" delay={80}>
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Flujo de aprobación
                </CardTitle>
                <CardDescription>
                  Borrador → revisión → aprobación → activación.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="flex items-start gap-3 rounded-md border border-periwinkle-100 p-4 text-sm text-periwinkle-700">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Cada paso queda en bitácora con responsable. Activar una
                  versión reemplaza la anterior sin borrar historia.
                </p>
                {canEdit ? (
                  <RuleFlowButtons companyId={companyId} id={id} status={r.status ?? ""} />
                ) : (
                  <p className="flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    <InfoOutlined className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Tu rol ({ctx.role}) es de solo lectura aquí. El flujo lo
                    avanza el contador.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Historial */}
        <section className="mt-4" aria-label="Historial de la regla">
          <Reveal>
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Historial (quién · qué · cuándo · motivo)
                </CardTitle>
                <CardDescription>
                  {trail.length === 0
                    ? "Sin eventos todavía."
                    : `${trail.length} ${trail.length === 1 ? "evento" : "eventos"}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trail.length === 0 ? (
                  <p className="flex items-start gap-2 text-sm text-periwinkle-500">
                    <History className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Sin eventos registrados.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {trail.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-periwinkle-100 px-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{t.action}</p>
                          {t.reason && (
                            <p className="truncate text-xs text-periwinkle-500" title={t.reason}>
                              {t.reason}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-periwinkle-500">
                          {fmtDateTime(t.occurredAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link
            href={`${base}/reglas`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver a reglas
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
