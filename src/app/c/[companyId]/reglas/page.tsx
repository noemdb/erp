import Link from "next/link";
import { redirect } from "next/navigation";
import Add from "@mui/icons-material/Add";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Rule from "@mui/icons-material/Rule";
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
import { listRules } from "@/modules/rules/service";
import { listConcepts } from "@/modules/withholdings/issue-islr";
import {
  RULE_KIND_ES,
  RULE_STATUS_ES,
  RULE_STATUS_VARIANT,
  es,
  fmtPorcentaje,
  fmtRange,
} from "@/modules/rules/labels";

export default async function ReglasPage({
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
  const canEdit = (await authorize(companyId, user.id, "rules.edit")).ok;

  const c = { companyId, userId: user.id };
  const [rows, concepts] = await Promise.all([listRules(c), listConcepts(c)]);
  const conceptById = new Map(concepts.map((x) => [x.id, x]));
  const sorted = [...rows].sort((a, b) =>
    String(b.effectiveRange ?? "").localeCompare(String(a.effectiveRange ?? ""))
  );

  const active = sorted.filter((r) => r.status === "active").length;
  const flow = sorted.filter((r) =>
    ["draft", "in_review", "approved"].includes(r.status ?? "")
  ).length;

  const kpis = [
    { label: "Reglas", value: String(sorted.length) },
    { label: "Activas (motor)", value: String(active) },
    { label: "En flujo", value: String(flow) },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Reglas · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
                Motor versionado · Cambio controlado
              </Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Reglas tributarias
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Borrador → revisión → aprobación → activación. La historia no
                se edita: activar cierra la vigencia anterior. Solo el motor
                usa las activas.
              </p>
            </div>
            {canEdit && (
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button asChild>
                  <Link href={`${base}/reglas/nueva`}>
                    <Add aria-hidden />
                    Nuevo borrador
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Estado de reglas">
          <div className="grid gap-4 sm:grid-cols-3">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 3) * 80} className="h-full">
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

        {/* Tabla */}
        <section className="mt-8" aria-label="Lista de reglas">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Versiones por vigencia
                </CardTitle>
                <CardDescription>
                  {sorted.length === 0
                    ? "Aún no hay reglas. El 75 % de IVA es semilla, no constante: créalo como borrador y actívalo."
                    : `${sorted.length} ${sorted.length === 1 ? "versión" : "versiones"}, de la más reciente a la más antigua.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <Rule className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      Sin valores reales no hay cálculo fiscal válido: la
                      matriz la firma el contador.
                    </p>
                    {canEdit && (
                      <Button asChild>
                        <Link href={`${base}/reglas/nueva`}>
                          <Add aria-hidden />
                          Crear primer borrador
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[56rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Tipo</th>
                          <th scope="col" className="px-4 py-3">Concepto</th>
                          <th scope="col" className="px-4 py-3 text-right">%</th>
                          <th scope="col" className="px-4 py-3 text-right">Sustraendo</th>
                          <th scope="col" className="px-4 py-3">Vigencia</th>
                          <th scope="col" className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-medium">
                              <Link
                                href={`${base}/reglas/${r.id}`}
                                className="text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                              >
                                {es(RULE_KIND_ES, r.ruleKind)}
                              </Link>
                            </td>
                            <td
                              className="max-w-48 truncate px-4 py-3 text-periwinkle-500"
                              title={conceptById.get(r.conceptId ?? "")?.nombre ?? ""}
                            >
                              {r.conceptId
                                ? (conceptById.get(r.conceptId)?.codigo ?? "—")
                                : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                              {fmtPorcentaje(r.porcentaje)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                              {r.sustraendo}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums">
                              {fmtRange(r.effectiveRange)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <Badge variant={RULE_STATUS_VARIANT[r.status ?? ""] ?? "outline"}>
                                {es(RULE_STATUS_ES, r.status)}
                              </Badge>
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

        {!canEdit && (
          <p className="mt-4 flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
            <InfoOutlined className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Tu rol ({ctx.role}) es de solo lectura aquí. Las reglas las edita
            el contador.
          </p>
        )}
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
