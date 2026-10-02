import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { PaymentForm } from "./payment-form";

export default async function NuevoPagoPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  return (
    <main>
      <h1>Nuevo pago o abono en cuenta</h1>
      <PaymentForm companyId={companyId} />
    </main>
  );
}
