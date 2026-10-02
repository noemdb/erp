import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { CompanyForm } from "@/components/companies/company-form";

export default async function NewCompanyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title="Nueva empresa"
        back={{ href: "/dashboard", label: "Panel" }}
        user={user}
        companyCount={memberships.length}
      />

      <main className="mx-auto max-w-2xl px-6 pb-16">
        <section className="pt-10">
          <Badge variant="outline" className="rounded-md px-3 py-1">
            Alta de empresa
          </Badge>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight">
            Registrar empresa
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-periwinkle-500">
            Cada empresa opera aislada con su propio RIF, períodos y
            reportes. Al crearla quedas como administrador.
          </p>
        </section>

        <section className="mt-8" aria-label="Datos de la empresa">
          <Card className="overflow-hidden rounded-lg">
            <div
              className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
              aria-hidden
            />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl tracking-tight">
                Datos fiscales
              </CardTitle>
              <CardDescription>
                RIF y razón social tal como aparecen en el registro fiscal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyForm />
            </CardContent>
          </Card>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver al panel
          </Link>
        </section>
      </main>

      <PageFooter context="Nueva empresa" />
    </div>
  );
}
