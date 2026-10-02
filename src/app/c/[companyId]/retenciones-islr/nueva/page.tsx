import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listConcepts } from "@/modules/withholdings/issue-islr";
import { listSettlementEvents } from "@/modules/payments/service";
import { IslrForm } from "./islr-form";

export default async function NuevaIslrPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const ctx = { companyId, userId: user.id };
  const events = (await listSettlementEvents(ctx)).filter((event) => event.status === "active");
  const concepts = await listConcepts(ctx);
  if (events.length === 0) return <main><p>Sin eventos de liquidación activos. Registra y asigna un pago o abono primero.</p></main>;
  return (
    <main>
      <h1>Nuevo comprobante ISLR</h1>
      <IslrForm companyId={companyId} events={events} concepts={concepts} />
    </main>
  );
}
