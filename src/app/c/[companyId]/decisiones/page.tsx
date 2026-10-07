import Link from "next/link";
import { redirect } from "next/navigation";
import Add from "@mui/icons-material/Add";
import Download from "@mui/icons-material/Download";
import Gavel from "@mui/icons-material/Gavel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { authorize } from "@/modules/tenancy/authorize";
import { listDecisions } from "@/modules/rdf/service";
import { RDF_GAP_ES, RDF_STATUS_ES, RDF_STATUS_VARIANT, es } from "@/modules/rdf/labels";

export default async function DecisionesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;
  const canPrepare = (await authorize(companyId, user.id, "docs.create")).ok;

  const rows = await listDecisions({ companyId, userId: user.id });
  const sorted = [...rows].sort((a, b) => String(b.codigo ?? "").localeCompare(String(a.codigo ?? "")));
  const firmadas = sorted.filter((r) => ["signed", "applied"].includes(r.status ?? "")).length;
  const enFlujo = sorted.filter((r) => ["draft", "in_review", "approved", "returned"].includes(r.status ?? "")).length;

  const kpis = [
    { label: "Decisiones", value: String(sorted.length) },
    { label: "Firmadas / aplicadas", value: String(firmadas) },
    { label: "En flujo", value: String(enFlujo) },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Decisiones · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: base, label: "Panel" }}
        user={user}
        role={ctx.role}
        companyCount={memberships.length}
        branding={{ color: ctx.company?.colorDistintivo ?? null, logoUrl: ctx.company?.logoUrl ?? null }}
      />
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="relative overflow-hidden pt-10">
          <div className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/10 via-[#352574]/5 to-transparent blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="rounded-md px-3 py-1">Decisión fiscal trazable · ADR-034</Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Decisiones fiscales</h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Cada regla nace de una decisión firmada por el contador. Sin firma no hay activación: lo firmado no se edita, se sustituye.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={`/api/companies/${companyId}/decisiones`}>
                  <Download aria-hidden /> Exportar CSV
                </a>
              </Button>
              {canPrepare && (
                <Button asChild>
                  <Link href={`${base}/decisiones/nueva`}>
                    <Add aria-hidden /> Nueva decisión
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8" aria-label="Estado de decisiones">
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

        <section className="mt-8" aria-label="Lista de decisiones">
          <Card className="overflow-hidden rounded-lg">
            <CardContent className="p-0">
              {sorted.length === 0 ? (
                <p className="flex items-start gap-2 px-5 py-6 text-sm text-periwinkle-500">
                  <Gavel className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Aún no hay decisiones. La sesión práctica produce la primera: hecho → alternativas → decisión firmada.
                </p>
              ) : (
                <ul className="divide-y divide-periwinkle-100">
                  {sorted.map((r) => (
                    <li key={r.id}>
                      <Link href={`${base}/decisiones/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-periwinkle-50">
                        <span className="font-mono text-sm font-semibold">{r.codigo}</span>
                        <Badge variant={RDF_STATUS_VARIANT[r.status ?? ""] ?? "outline"}>{es(RDF_STATUS_ES, r.status)}</Badge>
                        <span className="text-sm text-periwinkle-500">{es(RDF_GAP_ES, r.gap)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.titulo}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
