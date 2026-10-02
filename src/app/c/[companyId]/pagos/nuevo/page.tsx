import { redirect } from "next/navigation";
import Payments from "@mui/icons-material/Payments";
import { Badge } from "@/components/ui/badge";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listParties } from "@/modules/parties/service";
import { PaymentForm } from "./payment-form";

export default async function NuevoPagoPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const parties = await listParties({ companyId, userId: user.id });
  const criterion = (ctx.company as { abonoCriterion?: string } | null)?.abonoCriterion ?? "unset";
  const base = `/c/${companyId}`;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Nuevo evento · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/pagos`, label: "Pagos" }}
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
                Liquidación · Evento
              </Badge>
              <Badge variant={criterion === "unset" ? "warning" : "outline"}>
                {criterion === "unset"
                  ? "G2 sin definir"
                  : criterion === "payment_only"
                    ? "G2: solo pagos"
                    : "G2: pagos o abonos"}
              </Badge>
            </div>
            <h1 className="mt-3 flex items-center gap-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              <Payments className="h-8 w-8" aria-hidden />
              Nuevo pago o abono en cuenta
            </h1>
            <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
              Registra el hecho económico con su fecha efectiva. No infiere
              abonos ni emite retenciones: después asígnalo a sus compras.
            </p>
          </div>
        </section>

        <section className="mt-8" aria-label="Formulario de evento">
          <PaymentForm
            companyId={companyId}
            parties={parties.map((p) => ({ rif: p.rifOriginal, razonSocial: p.razonSocial, status: p.status ?? "active" }))}
            criterion={criterion}
          />
        </section>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
