import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Lock from "@mui/icons-material/Lock";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { authorize } from "@/modules/tenancy/authorize";
import { listAuditEvents } from "@/modules/audit/queries";
import { getDecision } from "@/modules/rdf/service";
import { listRules } from "@/modules/rules/service";
import { RDF_GAP_ES, RDF_STATUS_ES, RDF_STATUS_VARIANT, es } from "@/modules/rdf/labels";
import { DecisionFlow } from "./flow-buttons";

function kv(label: string, value: string) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 border-b border-periwinkle-100 py-2 text-sm last:border-0">
      <dt className="text-periwinkle-500">{label}</dt>
      <dd className="break-words font-medium">{value || "—"}</dd>
    </div>
  );
}

export default async function DecisionDetallePage({ params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const c = { companyId, userId: user.id };
  const data = await getDecision(c, id);
  if (!data) redirect(`${base}/decisiones`);
  const { decision: r, links } = data;
  const rules = await listRules(c);
  const trail = await listAuditEvents(c, { entityType: "fiscal_decision", entityId: id });
  const canPrepare = (await authorize(companyId, user.id, "docs.create")).ok;
  const canSign = (await authorize(companyId, user.id, "rules.edit")).ok;
  const locked = ["signed", "applied", "superseded", "rejected"].includes(r.status ?? "");
  const ruleById = new Map(rules.map((x) => [x.id, x]));

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`${r.codigo} · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/decisiones`, label: "Decisiones" }}
        user={user}
        role={ctx.role}
        companyCount={memberships.length}
        branding={{ color: ctx.company?.colorDistintivo ?? null, logoUrl: ctx.company?.logoUrl ?? null }}
      />
      <main className="mx-auto max-w-4xl px-6 pb-16">
        <section className="relative overflow-hidden pt-10">
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md px-3 py-1 font-mono">{r.codigo}</Badge>
              <Badge variant={RDF_STATUS_VARIANT[r.status ?? ""] ?? "outline"}>{es(RDF_STATUS_ES, r.status)}</Badge>
              <Badge variant="outline">{es(RDF_GAP_ES, r.gap)}</Badge>
            </div>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{r.titulo}</h1>
            {locked && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-periwinkle-500">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {r.status === "signed" || r.status === "applied"
                  ? `Firmada · sha256 ${r.contentSha256 ?? "—"}. No se edita: la corrección es un RDF nuevo que cita a este.`
                  : "Estado terminal. Solo lectura."}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6" aria-label="Ficha de decisión">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Pregunta y alternativas</CardTitle>
                <CardDescription>{r.pregunta}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {((r.alternativas ?? []) as { letra: string; descripcion: string; impacto_numerico?: string }[]).map((a) => (
                    <li key={a.letra} className="rounded-md bg-periwinkle-50 px-3 py-2 text-sm">
                      <span className="font-bold">{a.letra}. </span>{a.descripcion}
                      {a.impacto_numerico && (<span className="ml-2 font-mono text-icy-aqua-700">→ {a.impacto_numerico}</span>)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Decisión y evidencia</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  {kv("Decisión", r.decision ?? "")}
                  {kv("Fundamento", r.fundamentoNormativo ?? "")}
                  {kv("Fórmula", r.formula ?? "")}
                  {kv("Redondeo", [r.redondeoMetodo, r.redondeoEtapa, r.redondeoPrecision].filter(Boolean).join(" · "))}
                  {kv("Momento fiscal", r.momentoFiscal ?? "")}
                  {kv("Ejemplo", JSON.stringify(r.ejemploNumerico ?? {}))}
                  {kv("Resultado esperado", r.resultadoEsperado ?? "")}
                  {kv("Cobertura", [r.ruleKind?.toUpperCase(), r.vigenciaDesde].filter(Boolean).join(" · desde "))}
                  {kv("Impacto en sistema", r.impactoSistema ?? "")}
                  {kv("Firmante", [r.firmanteNombre, r.firmanteDoc].filter(Boolean).join(" · "))}
                  {kv("sha256", r.contentSha256 ?? "")}
                  {kv("Sustituye a", r.supersedesId ?? "")}
                  {kv("Motivo", r.motivo ?? "")}
                </dl>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Reglas vinculadas ({links.length})</CardTitle>
                <CardDescription>La activación exige al menos un vínculo autoriza con cobertura.</CardDescription>
              </CardHeader>
              <CardContent>
                {links.length === 0 ? (
                  <p className="text-sm text-periwinkle-500">Sin vínculos. Vincule la regla que esta decisión autoriza antes de activarla.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {links.map((l) => {
                      const rule = ruleById.get(l.ruleId);
                      return (
                        <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-md bg-periwinkle-50 px-3 py-2">
                          <Badge variant="outline">{l.rol}</Badge>
                          <span className="font-mono">{rule ? `${rule.ruleKind?.toUpperCase()} · ${rule.porcentaje}` : l.ruleId}</span>
                          <span className="text-periwinkle-500">{rule?.status ?? ""}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Flujo</CardTitle>
                <CardDescription>Su rol: {ctx.role}. Preparar: administrativo/contador. Aprobar y firmar: solo contador.</CardDescription>
              </CardHeader>
              <CardContent>
                <DecisionFlow
                  companyId={companyId}
                  id={id}
                  status={r.status ?? ""}
                  canPrepare={canPrepare}
                  canSign={canSign}
                  rules={rules.map((x) => ({ id: x.id, ruleKind: x.ruleKind, porcentaje: x.porcentaje, effectiveRange: x.effectiveRange, status: x.status }))}
                />
              </CardContent>
            </Card>
          </Reveal>

          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Bitácora ({trail.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {trail.map((t) => (
                    <li key={t.id} className="flex flex-wrap gap-2">
                      <span className="font-mono text-periwinkle-500">{t.action}</span>
                      <span>{new Date(t.occurredAt).toLocaleString("es-VE")}</span>
                      {t.reason && <span className="text-periwinkle-500">· {t.reason}</span>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link href={`${base}/decisiones`} className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]">
            <ArrowBack className="h-4 w-4" aria-hidden /> Volver a decisiones
          </Link>
        </div>
      </main>
      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
