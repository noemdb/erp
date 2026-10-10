import { redirect } from "next/navigation";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { canManageUsersAnywhere } from "@/modules/identity/admin";
import { REGIMENES, FLOWS } from "./casos";
import { CasosExplorer } from "./casos-explorer";

export default async function CasosUsoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  const canManageUsers = await canManageUsersAnywhere(user.id);

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title="Casos de Uso"
        back={{ href: "/dashboard", label: "Dashboard" }}
        user={user}
        companyCount={memberships.length}
        canManageUsers={canManageUsers}
      />
      <div className="mx-auto w-full px-6 pb-16">
        <CasosExplorer regimenes={REGIMENES} flujos={FLOWS} />
      </div>
      <PageFooter context="Casos de Uso" />
    </div>
  );
}
