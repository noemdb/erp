import Link from "next/link";
import { redirect } from "next/navigation";
import Settings from "@mui/icons-material/Settings";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { BackupCard, RestoreCard, CleanCard, StatusCard } from "./config-forms";

export default async function ConfiguracionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const mems = await listMemberships(user.id);
  let ok = false;
  for (const m of mems) {
    if ((await authorize(m.companyId, user.id, "users.manage")).ok) {
      ok = true;
      break;
    }
  }
  if (!ok) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title="Configuración"
        back={{ href: "/dashboard", label: "Dashboard" }}
        user={user}
        companyCount={mems.length}
      />

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="relative overflow-hidden pt-10">
          <div
            className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/10 via-[#352574]/5 to-transparent blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Administración
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Configuración
            </h1>
            <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
              Funciones de base de datos. Solo administradores. Cada acción queda en el log del servidor.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6" aria-label="Base de datos">
          <Reveal>
            <StatusCard />
          </Reveal>
          <Reveal delay={80}>
            <BackupCard />
          </Reveal>
          <Reveal delay={160}>
            <RestoreCard />
          </Reveal>
          <Reveal delay={240}>
            <CleanCard />
          </Reveal>
        </section>

        <div className="mt-8 flex items-center gap-2 text-sm text-periwinkle-500">
          <Settings className="h-4 w-4" aria-hidden />
          <p>
            Solo quien administra el sistema ve esta página.{" "}
            <Link href="/dashboard" className="underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]">
              Volver al dashboard
            </Link>
          </p>
        </div>
      </main>

      <PageFooter />
    </div>
  );
}
