import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
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
import { getSalesMode } from "@/modules/tenancy/settings";
import { getAbonoCriterion } from "@/modules/withholdings/g2-criterion";
import { FiscalProfileForm } from "./fiscal-profile-form";
import { ModeForm } from "./mode-form";

const CRITERION_ES: Record<string, { label: string; variant: "warning" | "outline" | "success" }> = {
  unset: { label: "Sin definir", variant: "warning" },
  payment_only: { label: "Solo pago", variant: "outline" },
  account_credit_or_payment: { label: "Pago o abono", variant: "success" },
};

export default async function ConfigPage({
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

  const c = { companyId, userId: user.id };
  const [mode, criterion] = await Promise.all([getSalesMode(c), getAbonoCriterion(c)]);
  const isAdmin = (await authorize(companyId, user.id, "companies.manage")).ok;
  const isContador =
    isAdmin || (await authorize(companyId, user.id, "periods.close")).ok;
  const crit = CRITERION_ES[criterion] ?? CRITERION_ES.unset!;
  const company = ctx.company as {
    condicionIva?: string;
    contribuyenteEspecialDesde?: string | null;
    agenteRetencionIva?: boolean | null;
    agenteRetencionIslr?: boolean | null;
    periodKind?: string | null;
  } | null;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Configuración · ${ctx.company?.razonSocial ?? "Empresa"}`}
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
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Empresa · Parámetros fiscales
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Configuración fiscal
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
              Perfil de la empresa, fuente del Libro de Ventas y criterio de
              abono. Todo cambio queda auditado con responsable.
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Perfil fiscal */}
          <Reveal className="h-full">
            <Card className="h-full overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Perfil fiscal de la empresa
                </CardTitle>
                <CardDescription>
                  Condición, agentes de retención y período. Solo admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAdmin ? (
                  <FiscalProfileForm
                    companyId={companyId}
                    initial={{
                      condicionIva: company?.condicionIva ?? "ordinario",
                      contribuyenteEspecialDesde: company?.contribuyenteEspecialDesde ?? null,
                      agenteRetencionIva: company?.agenteRetencionIva ?? false,
                      agenteRetencionIslr: company?.agenteRetencionIslr ?? false,
                      periodKind: company?.periodKind ?? "monthly",
                    }}
                  />
                ) : (
                  <dl className="divide-y divide-periwinkle-100 text-sm">
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-periwinkle-500">Condición IVA</dt>
                      <dd>{company?.condicionIva ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-periwinkle-500">Agente IVA / ISLR</dt>
                      <dd>
                        {company?.agenteRetencionIva ? "Sí" : "No"} /{" "}
                        {company?.agenteRetencionIslr ? "Sí" : "No"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-periwinkle-500">Período</dt>
                      <dd>{company?.periodKind === "biweekly" ? "Quincenal" : "Mensual"}</dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <div className="flex flex-col gap-4">
            {/* Modo ventas */}
            <Reveal>
              <Card className="rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base tracking-tight">
                    Libro de Ventas (G7)
                  </CardTitle>
                  <CardDescription>
                    Se alimenta de{" "}
                    <strong>{mode === "z" ? "reportes Z" : "facturas individuales"}</strong>.
                    Solo contador.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isContador ? (
                    <ModeForm companyId={companyId} mode={mode} />
                  ) : (
                    <p className="flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                      <InfoOutlined className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      Tu rol ({ctx.role}) es de solo lectura aquí.
                    </p>
                  )}
                </CardContent>
              </Card>
            </Reveal>

            {/* Criterio G2 */}
            <Reveal delay={80}>
              <Card className="rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base tracking-tight">
                    Criterio de abono (G2)
                  </CardTitle>
                  <CardDescription>
                    Qué evento dispara la retención ISLR. Lo configura el
                    contador en Retenciones ISLR.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={crit.variant}>{crit.label}</Badge>
                    <Link
                      href={`${base}/retenciones-islr`}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#120c27] transition-colors hover:bg-periwinkle-100"
                    >
                      Configurar
                      <ArrowForward className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href={base}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver al panel
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
