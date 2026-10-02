import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listEligiblePurchases } from "@/modules/withholdings/issue-iva";
import { EmitForm } from "./emit-form";

export default async function NuevaRetencionPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const eligible = await listEligiblePurchases({ companyId, userId: user.id });
  return (
    <main>
      <h1>Nuevo comprobante IVA</h1>
      {eligible.length === 0 ? <p>Sin compras elegibles (validadas, con IVA, no retenidas).</p> : <EmitForm companyId={companyId} eligible={eligible} />}
    </main>
  );
}
