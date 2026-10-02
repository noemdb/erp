import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
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
import { PartyForm } from "./party-form";

export default async function NuevoTerceroPage({
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
  const canCreate = (await authorize(companyId, user.id, "docs.create")).ok;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Terceros · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/terceros`, label: "Terceros" }}
        user={user}
        role={ctx.role}
        companyCount={memberships.length}
        branding={{
          color: ctx.company?.colorDistintivo ?? null,
          logoUrl: ctx.company?.logoUrl ?? null,
        }}
      />

      <main className="mx-auto max-w-3xl px-6 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden pt-10">
          <div
            className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/10 via-[#352574]/5 to-transparent blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Datos base · Terceros
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Nuevo tercero
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
              Se guarda el RIF original y el normalizado para búsqueda. Si el
              RIF ya existe, se actualizan sus datos sin duplicar. El perfil
              fiscal es opcional ahora y vive con vigencia en el detalle.
            </p>
          </div>
        </section>

        {/* Formulario */}
        <section className="mt-8" aria-label="Datos del tercero">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Datos del tercero
                </CardTitle>
                <CardDescription>
                  Cliente o proveedor: el rol lo determina la operación, no
                  este maestro.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canCreate ? (
                  <PartyForm companyId={companyId} />
                ) : (
                  <p className="flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    <InfoOutlined
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden
                    />
                    Tu rol ({ctx.role}) es de solo lectura aquí. Pide a un
                    administrativo o contador que registre el tercero.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link
            href={`${base}/terceros`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver a terceros
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
