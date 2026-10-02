import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { SaleForm } from "./sale-form";

export default async function NuevaVentaPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  return (
    <main>
      <h1>Nueva venta</h1>
      <SaleForm companyId={companyId} />
    </main>
  );
}
