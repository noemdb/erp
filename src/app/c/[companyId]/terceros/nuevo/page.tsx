import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { PartyForm } from "./party-form";

export default async function NuevoTerceroPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  return (
    <main>
      <h1>Nuevo tercero</h1>
      <PartyForm companyId={companyId} />
    </main>
  );
}
