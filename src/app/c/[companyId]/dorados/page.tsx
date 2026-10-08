import Link from "next/link";
import { redirect } from "next/navigation";
import Verified from "@mui/icons-material/Verified";
import Science from "@mui/icons-material/Science";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Warning from "@mui/icons-material/Warning";
import Gavel from "@mui/icons-material/Gavel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listGoldenCases, executeGoldenCase, coverageByRule, tipoDeId } from "@/modules/goldens/service";
import { verifyGolden } from "@/modules/goldens/verify";
import { GOLDEN_TIPO_ES, GOLDEN_ORIGEN_ES, GOLDEN_ESTADO_ES, GOLDEN_ESTADO_VARIANT, es } from "@/modules/goldens/labels";

export const dynamic = "force-dynamic";

export default async function DoradosPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const cases = listGoldenCases();
  const firmados = cases.filter((c) => verifyGolden(c).firmado).length;
  const reproducen = cases.filter((c) => executeGoldenCase(c).pass).length;
  const coverage = coverageByRule(cases);

  const kpis = [
    { label: "Dorados", value: String(cases.length) },
    { label: "Firmados", value: String(firmados) },
    { label: "Reproducen", value: String(reproducen) },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Dorados · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: base, label: "Panel" }}
        user={user}
        role={ctx.role}
        companyCount={memberships.length}
        branding={{ color: ctx.company?.colorDistintivo ?? null, logoUrl: ctx.company?.logoUrl ?? null }}
      />
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="relative overflow-hidden pt-10">
          <div className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/10 via-[#352574]/5 to-transparent blur-3xl" aria-hidden />
          <div className="relative">
            <Badge variant="outline" className="rounded-md px-3 py-1">Escenarios de contador · blueprint/goldenValidation</Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Dorados</h1>
            <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
              Escenarios que el motor debe reproducir. Sin firma verificable no hay dorado; sin dorado firmado no hay go-live.
              La firma criptográfica y el respaldo en DB están pendientes de ADR-035.
            </p>
          </div>
        </section>

        <section className="mt-8" aria-label="Estado de dorados">
          <div className="grid gap-4 sm:grid-cols-3">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 3) * 80} className="h-full">
                <Card className="h-full rounded-lg">
                  <CardContent className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">{k.label}</p>
                    <p className="mt-1 text-2xl font-bold">{k.value}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mt-8" aria-label="Cobertura por regla">
          <Card className="rounded-lg">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold tracking-tight">Cobertura por tipo de regla</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {coverage.length === 0 ? (
                  <p className="text-sm text-periwinkle-500">Sin dorados en fixtures/tax-scenarios/.</p>
                ) : (
                  coverage.map((r) => (
                    <div key={r.tipo}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium">{es(GOLDEN_TIPO_ES, r.tipo)}</span>
                        <span className="font-mono text-periwinkle-500">{r.firmados}/{r.total}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-periwinkle-100" role="presentation">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#37c8a1] to-[#352574]"
                          style={{ width: `${r.total ? (r.firmados / r.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8" aria-label="Lista de dorados">
          <Card className="overflow-hidden rounded-lg">
            <CardContent className="p-0">
              {cases.length === 0 ? (
                <p className="flex items-start gap-2 px-5 py-6 text-sm text-periwinkle-500">
                  <Gavel className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Aún no hay dorados en fixtures/tax-scenarios/. Los 17 candidatos viven en pendientes/TERCERA_REV/files/.
                </p>
              ) : (
                <ul className="divide-y divide-periwinkle-100">
                  {cases.map((c) => {
                    const exec = executeGoldenCase(c);
                    const firmado = verifyGolden(c).firmado;
                    return (
                      <li key={c.id}>
                        <Link href={`${base}/dorados/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-periwinkle-50">
                          <span className="font-mono text-sm font-semibold">{c.id}</span>
                          <Badge variant={GOLDEN_ESTADO_VARIANT[c.estado ?? ""] ?? "outline"}>{es(GOLDEN_ESTADO_ES, c.estado)}</Badge>
                          <span className="text-sm text-periwinkle-500">{es(GOLDEN_TIPO_ES, tipoDeId(c.id))}</span>
                          <span className="text-sm text-periwinkle-500">{es(GOLDEN_ORIGEN_ES, c.origen)}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.descripcion}</span>
                          {firmado ? (
                            <Badge variant="success"><CheckCircle className="h-3.5 w-3.5" aria-hidden /> firmado</Badge>
                          ) : (
                            <Badge variant="outline">sin firma</Badge>
                          )}
                          {exec.pass ? (
                            <Badge variant="outline"><Verified className="h-3.5 w-3.5" aria-hidden /> reproduce</Badge>
                          ) : (
                            <Badge variant="warning"><Warning className="h-3.5 w-3.5" aria-hidden /> diff</Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8" aria-label="Nota de go-live">
          <Card className="rounded-lg border-icy-aqua-200 bg-icy-aqua-50/40">
            <CardContent className="p-5">
              <div className="flex items-start gap-2 text-sm text-periwinkle-700">
                <Science className="mt-0.5 h-4 w-4 shrink-0 text-icy-aqua-700" aria-hidden />
                <p>
                  El gate de go-live exige <strong>30 dorados firmados</strong> (<code>_manifest.umbralGolive</code>); hoy hay{" "}
                  <strong>{firmados}</strong>. De los 17 candidatos, 12 son ejecutables y 9 firmables; hacen falta ~21 casos nuevos
                  (<code>blueprint/goldenValidation/04-tests-rollout.md §2</code>).
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
