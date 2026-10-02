import { redirect } from "next/navigation";
import PointOfSale from "@mui/icons-material/PointOfSale";
import { Badge } from "@/components/ui/badge";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listSaleDocs } from "@/modules/sales/service";
import { listParties } from "@/modules/parties/service";
import { SaleForm } from "./sale-form";

export default async function NuevaVentaPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const c = { companyId, userId: user.id };
  const [docs, clients] = await Promise.all([listSaleDocs(c), listParties(c)]);
  const zMode = (ctx.company as { salesMode?: string } | null)?.salesMode === "z";
  const base = `/c/${companyId}`;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Nueva venta · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/ventas`, label: "Ventas" }}
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
                Registrar · Venta
              </Badge>
              {zMode && (
                <Badge variant="secondary">Libro por reportes Z</Badge>
              )}
            </div>
            <h1 className="mt-3 flex items-center gap-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              <PointOfSale className="h-8 w-8" aria-hidden />
              Nueva venta
            </h1>
            <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
              Factura, nota de crédito o débito, exportación o cuenta de
              terceros: se valida base + IVA = total antes de guardarse y
              alimenta el Libro de Ventas.
            </p>
          </div>
        </section>

        <section className="mt-8" aria-label="Formulario de venta">
          <SaleForm
            companyId={companyId}
            documents={docs}
            clients={clients.map((s) => ({ rif: s.rifOriginal, razonSocial: s.razonSocial, status: s.status ?? "active" }))}
            zMode={zMode}
          />
        </section>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
