import Link from "next/link";
import { redirect } from "next/navigation";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Warning from "@mui/icons-material/Warning";
import Pending from "@mui/icons-material/Pending";
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
import { listDecisions } from "@/modules/rdf/service";
import { listRules } from "@/modules/rules/service";
import { listGoldenCases } from "@/modules/goldens/service";

type Gate = { label: string; detail: string; state: "ok" | "warn" | "pending"; source: string };

function GateBadge({ state }: { state: Gate["state"] }) {
  if (state === "ok")
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" aria-hidden /> Firmado
      </Badge>
    );
  if (state === "warn")
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <Warning className="h-3 w-3" aria-hidden /> Parcial
      </Badge>
    );
  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <Pending className="h-3 w-3" aria-hidden /> Pendiente
    </Badge>
  );
}

export default async function EstadoFiscalPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const companyContext = await getCompanyContext(companyId, user.id);
  if (!companyContext) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;
  const c = { companyId, userId: user.id };

  const [decisions, rules] = await Promise.all([listDecisions(c), listRules(c)]);
  const signed = decisions.filter((d) => d.status === "signed" || d.status === "applied");
  const g9 = decisions.find((d) => d.gap === "G9");
  const g9Signed = !!g9 && (g9.status === "signed" || g9.status === "applied");
  const activeRules = rules.filter((r) => r.status === "active" && !r.synthetic);
  const syntheticRules = rules.filter((r) => r.synthetic);
  const goldens = listGoldenCases();
  const goldensSigned = goldens.filter((g) => g.estado === "VALIDADO_CONTADOR");

  const gates: { title: string; items: Gate[] }[] = [
    {
      title: "Decisiones firmadas (en el sistema)",
      items: [
        {
          label: `RDF: ${signed.length}/${decisions.length} firmadas`,
          detail: signed.length > 0 ? signed.map((d) => d.codigo).join(", ") : "Aún no hay decisiones firmadas en esta empresa.",
          state: signed.length > 0 ? (signed.length === decisions.length && decisions.length > 0 ? "ok" : "warn") : "pending",
          source: "fiscal_decisions",
        },
        {
          label: `G9 serie ISLR: ${g9 ? `${g9.codigo} (${g9.status})` : "sin decisión"}`,
          detail: g9Signed
            ? "Serie definida por firma. Con opción A no hay migración."
            : "Firmar la hoja G9 (opción A adopta la serie provisional sin migrar).",
          state: g9Signed ? "ok" : "pending",
          source: "fiscal_decisions gap=G9",
        },
        {
          label: `Reglas activas no sintéticas: ${activeRules.length}`,
          detail: syntheticRules.length > 0
            ? `${syntheticRules.length} sintéticas de prueba (nunca activan en producción).`
            : "Sin reglas de prueba pendientes de sustituir.",
          state: activeRules.length > 0 ? "ok" : "pending",
          source: "withholding_rules",
        },
        {
          label: `Dorados firmados: ${goldensSigned.length}/${goldens.length}`,
          detail: "Meta 30–50 firmados por el contador para el gate go-live.",
          state: goldensSigned.length >= 30 ? "ok" : goldens.length > 0 ? "warn" : "pending",
          source: "fixtures (global)",
        },
      ],
    },
    {
      title: "Expediente externo (fuera del sistema)",
      items: [
        { label: "Matriz de Reglas v1 firmada", detail: "Borrador en docs/anexos/matriz-reglas-v1.md + hoja G9-ISLR para firmar.", state: "pending", source: "pedido F0-01" },
        { label: "Muestras M-1…M-4", detail: "Mes CSV + Z + libros del contador + XLSX plantilla del mismo mes.", state: "pending", source: "pedido F0-01 §E" },
        { label: "Q14 TXT/XML SENIAT en v1", detail: "Sí/No + layouts + ejemplos aceptados. Sin spec no se codifica.", state: "pending", source: "pedido F0-01 B-14" },
        { label: "G1/G7 por empresa", detail: "Quién es especial (period_kind) y fuente de ventas por sucursal (sales_mode).", state: "pending", source: "checklist-F0" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Estado fiscal · ${companyContext.company?.razonSocial ?? "Empresa"}`}
        back={{ href: base, label: "Panel" }}
        user={user}
        role={companyContext.role}
        companyCount={memberships.length}
      />

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="relative overflow-hidden pt-10">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="rounded-md px-3 py-1">
                Solo lectura · todos los roles
              </Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Estado fiscal
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Qué está firmado en el sistema y qué falta en el expediente para
                producción. Lo no firmado no activa reglas ni valida comprobantes.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`${base}/decisiones`}>Ver decisiones</Link>
              </Button>
            </div>
          </div>
        </section>

        {gates.map((g) => (
          <section key={g.title} className="mt-8" aria-label={g.title}>
            <Reveal>
              <Card className="overflow-hidden rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base tracking-tight">{g.title}</CardTitle>
                  <CardDescription>
                    {g.title.startsWith("Decisiones")
                      ? "Leído de la base de datos de esta empresa."
                      : "Se verifica en el expediente con el contador, no en el sistema."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-periwinkle-100">
                    {g.items.map((it) => (
                      <li key={it.label} className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#120c27]">{it.label}</p>
                          <p className="mt-0.5 text-sm text-periwinkle-500">{it.detail}</p>
                          <p className="mt-1 font-mono text-xs text-periwinkle-400">fuente: {it.source}</p>
                        </div>
                        <GateBadge state={it.state} />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Reveal>
          </section>
        ))}
      </main>
      <PageFooter context="Estado fiscal" />
    </div>
  );
}
