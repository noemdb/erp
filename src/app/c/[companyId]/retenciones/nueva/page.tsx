import Link from "next/link";
import { redirect } from "next/navigation";
import Add from "@mui/icons-material/Add";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listEligiblePurchases } from "@/modules/withholdings/issue-iva";
import { EmitForm } from "./emit-form";

const steps = ["Elegir facturas", "Previsualizar cálculo", "Emitir comprobante"];

export default async function NuevaRetencionPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const auth = await authorize(companyId, user.id, "withholdings.issue");
  const base = `/c/${companyId}`;
  const esAgente = ctx.company?.agenteRetencionIva ?? false;
  const eligible = auth.ok && esAgente ? await listEligiblePurchases({ companyId, userId: user.id }) : [];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Nuevo comprobante · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/retenciones`, label: "Comprobantes" }}
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
              Comprobantes · Nuevo
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Nuevo comprobante IVA
            </h1>
            <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
              Un comprobante puede agrupar varias facturas. Primero ves el
              cálculo, luego emites con número sin huecos.
            </p>
            <ol className="mt-5 flex flex-wrap gap-2" aria-label="Pasos de emisión">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className={
                      i === 0
                        ? "flex h-6 w-6 items-center justify-center rounded-md bg-[#120c27] text-xs font-bold text-white"
                        : "flex h-6 w-6 items-center justify-center rounded-md bg-periwinkle-100 text-xs font-bold text-periwinkle-600"
                    }
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-periwinkle-700">{s}</span>
                  {i < steps.length - 1 && (
                    <span className="mx-1 h-px w-6 bg-periwinkle-200" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Contenido */}
        <section className="mt-8" aria-label="Emisión de comprobante">
          {!auth.ok ? (
            <Reveal>
              <Card className="rounded-lg">
                <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <p className="max-w-sm text-sm text-periwinkle-500">
                    Solo quien puede emitir comprobantes ve este formulario.
                    Pide a tu contador que lo emita.
                  </p>
                  <Button asChild variant="outline">
                    <Link href={`${base}/retenciones`}>Volver a comprobantes</Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ) : !esAgente ? (
            <Reveal>
              <Card className="rounded-lg">
                <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                    <ReceiptLong className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="max-w-md text-sm text-periwinkle-500">
                    <strong className="font-semibold text-periwinkle-900">
                      {ctx.company?.razonSocial ?? "Esta empresa"}
                    </strong>{" "}
                    aún no es agente de retención IVA, por eso no hay nada que
                    retener. Un administrador puede activarlo en Configuración.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild>
                      <Link href={`${base}/configuracion`}>Ir a configuración</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`${base}/retenciones`}>Volver a comprobantes</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ) : eligible.length === 0 ? (
            <Reveal>
              <Card className="rounded-lg">
                <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                    <ReceiptLong className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="max-w-sm text-sm text-periwinkle-500">
                    Sin compras elegibles: necesitas facturas validadas, con
                    IVA y aún no retenidas.
                  </p>
                  <Button asChild>
                    <Link href={`${base}/compras`}>
                      <Add aria-hidden />
                      Ir a compras
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ) : (
            <EmitForm companyId={companyId} eligible={eligible} />
          )}
        </section>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
