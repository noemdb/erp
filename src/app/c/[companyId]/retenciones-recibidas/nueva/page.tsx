import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listOpenPurchases } from "@/modules/payments/service";
import { RecvForm } from "./recv-form";

export default async function NuevaRecibidaPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const purchases = await listOpenPurchases({ companyId, userId: user.id });
  return (
    <main>
      <h1>Registrar retención recibida</h1>
      <RecvForm companyId={companyId} purchases={purchases} />
    </main>
  );
}
