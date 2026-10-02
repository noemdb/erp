import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listReceived } from "@/modules/received/service";

export default async function RecibidasPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await listReceived({ companyId, userId: user.id });
  return (
    <main>
      <h1>Retenciones recibidas</h1>
      <p><Link href={`/c/${companyId}/retenciones-recibidas/nueva`}>Registrar comprobante recibido</Link></p>
      <table>
        <thead><tr><th>Agente</th><th>Comprobante</th><th>Retenido</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td>{r.agentRazon}</td><td><Link href={`/c/${companyId}/retenciones-recibidas/${r.id}`}>{r.certificateNumber}</Link></td><td>{r.montoRetenido}</td><td>{r.status}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
