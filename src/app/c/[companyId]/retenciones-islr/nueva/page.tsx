import Link from "next/link";
import { redirect } from "next/navigation";
import Approval from "@mui/icons-material/Approval";
import ManageSearch from "@mui/icons-material/ManageSearch";
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
import { listConcepts } from "@/modules/withholdings/issue-islr";
import { listSettlementEvents } from "@/modules/payments/service";
import { IslrForm } from "./islr-form";

const criterionMeta: Record<string, { label: string; variant: "warning" | "outline" | "success" }> = {
  unset: { label: "G2 sin definir (fail-closed)", variant: "warning" },
  payment_only: { label: "G2: solo pagos", variant: "outline" },
  account_credit_or_payment: { label: "G2: pagos o abonos", variant: "success" },
};

export default async function NuevaIslrPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;
  const c = { companyId, userId: user.id };

  const events = (await listSettlementEvents(c)).filter((event) => event.status === "active");
  const concepts = await listConcepts(c);
  const criterion = (ctx.company as { abonoCriterion?: string } | null)?.abonoCriterion ?? "unset";
  const crit = criterionMeta[criterion] ?? { label: criterion, variant: "outline" as const };

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`ISLR · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/retenciones-islr`, label: "Retenciones ISLR" }}
        user={user}
        role={ctx.role}
        companyCount={memberships.length}
        branding={{
          color: ctx.company?.colorDistintivo ?? null,
          logoUrl: ctx.company?.logoUrl ?? null,
        }}
      />

      <main className="mx-auto max-w-4xl px-6 pb-16">
        <section className="relative overflow-hidden pt-10">
          <div
            className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/10 via-[#352574]/5 to-transparent blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md px-3 py-1">
                Comprobante · Retención ISLR
              </Badge>
              <Badge variant={crit.variant}>{crit.label}</Badge>
            </div>
            <h1 className="mt-3 flex items-center gap-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              <Approval className="h-8 w-8" aria-hidden />
              Nuevo comprobante ISLR
            </h1>
            <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
              Primero se comparan ambos criterios (pago vs abono); solo se emite
              si el criterio de la empresa lo permite. Emitido es inmutable:
              solo anula o sustituye.
            </p>
          </div>
        </section>

        <section className="mt-8" aria-label="Emisión de retención ISLR">
          {events.length === 0 ? (
            <Reveal>
              <Card className="rounded-lg">
                <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                    <ManageSearch className="h-6 w-6" aria-hidden />
                  </span>
                  <CardTitle className="text-base tracking-tight">
                    Sin eventos de liquidación activos
                  </CardTitle>
                  <CardDescription>
                    Registra y asigna un pago o abono primero: es el disparador
                    de la retención (pago o abono en cuenta, lo que ocurra primero).
                  </CardDescription>
                  <Button asChild>
                    <Link href={`${base}/pagos/nuevo`}>
                      Registrar evento
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ) : concepts.length === 0 ? (
            <Reveal>
              <Card className="rounded-lg">
                <CardContent className="px-6 py-12 text-center">
                  <CardTitle className="text-base tracking-tight">
                    Sin conceptos ISLR configurados
                  </CardTitle>
                  <CardDescription>
                    Pide al contador que configure los conceptos (honorarios,
                    alquileres…) con su vigencia antes de emitir.
                  </CardDescription>
                </CardContent>
              </Card>
            </Reveal>
          ) : (
            <IslrForm companyId={companyId} events={events} concepts={concepts} />
          )}
        </section>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
