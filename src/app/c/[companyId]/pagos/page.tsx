import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listSettlementEvents } from "@/modules/payments/service";

export default async function PagosPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await listSettlementEvents({ companyId, userId: user.id });
  return (
    <main>
      <h1>Pagos y abonos en cuenta</h1>
      <p><Link href={`/c/${companyId}/pagos/nuevo`}>Registrar evento</Link></p>
      <table>
        <thead><tr><th>Tipo</th><th>Fecha</th><th>RIF</th><th>Monto</th><th>Asignado</th><th>Referencia</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td>{r.eventType === "payment" ? "Pago" : "Abono en cuenta"}</td><td><Link href={`/c/${companyId}/pagos/${r.id}`}>{r.eventDate}</Link></td><td>{r.rif}</td><td>{r.amount}</td><td>{r.allocated}</td><td>{r.sourceRef ?? r.method ?? "—"}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
