import { redirect } from "next/navigation";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import { Badge } from "@/components/ui/badge";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listPurchaseDocs } from "@/modules/fiscal-docs/service";
import { listParties } from "@/modules/parties/service";
import { PurchaseForm } from "./purchase-form";

export default async function NuevaCompraPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const docs = await listPurchaseDocs({ companyId, userId: user.id });
  const suppliers = await listParties({ companyId, userId: user.id });
  const base = `/c/${companyId}`;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Nueva compra · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/compras`, label: "Compras" }}
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
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="rounded-md px-3 py-1">
                Registrar · Compra
              </Badge>
              <h1 className="mt-3 flex items-center gap-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                <ReceiptLong className="h-8 w-8" aria-hidden />
                Nueva compra
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Factura, nota de crédito o débito e importaciones: cada documento
                se valida (base + IVA + exento = total) antes de guardarse y
                alimenta el Libro de Compras.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-label="Formulario de compra">
          <PurchaseForm
            companyId={companyId}
            documents={docs}
            suppliers={suppliers.map((s) => ({ rif: s.rifOriginal, razonSocial: s.razonSocial, status: s.status }))}
          />
        </section>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
