import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listSettlementEvents, listOpenPurchases } from "@/modules/payments/service";
import { AllocateForm } from "./allocate-form";

export default async function PagoDetallePage({ params }: { params: Promise<{ companyId: string; paymentId: string }> }) {
  const { companyId, paymentId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const events = await listSettlementEvents({ companyId, userId: user.id });
  const event = events.find((row) => row.id === paymentId);
  if (!event) redirect(`/c/${companyId}/pagos`);
  const purchases = await listOpenPurchases({ companyId, userId: user.id });
  return (
    <main>
      <h1>{event.eventType === "payment" ? "Pago" : "Abono en cuenta"} {event.eventDate} — {event.amount} (asignado {event.allocated})</h1>
      <h2>Asignar a compra (provisional; no emite retención)</h2>
      <AllocateForm companyId={companyId} eventId={paymentId} purchases={purchases} />
    </main>
  );
}
