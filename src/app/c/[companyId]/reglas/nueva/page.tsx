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
import { listConcepts } from "@/modules/withholdings/issue-islr";
import { DraftForm } from "./draft-form";

export default async function NuevaReglaPage({
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
  const canEdit = (await authorize(companyId, user.id, "rules.edit")).ok;
  const concepts = await listConcepts({ companyId, userId: user.id });

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Reglas · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/reglas`, label: "Reglas" }}
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
              Cambio controlado · Paso 1 de 4
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Nuevo borrador de regla
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
              Los valores solo valen con matriz firmada por el contador. Nada
              se edita después: cada cambio es una vigencia nueva.
            </p>
          </div>
        </section>

        {/* Formulario */}
        <section className="mt-8" aria-label="Borrador de regla">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Parámetros versionados
                </CardTitle>
                <CardDescription>
                  La semántica del cálculo vive en código; aquí solo datos con
                  vigencia.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canEdit ? (
                  <DraftForm companyId={companyId} concepts={concepts} />
                ) : (
                  <p className="flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    <InfoOutlined
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden
                    />
                    Tu rol ({ctx.role}) es de solo lectura aquí. Los
                    borradores los crea el contador.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link
            href={`${base}/reglas`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver a reglas
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
