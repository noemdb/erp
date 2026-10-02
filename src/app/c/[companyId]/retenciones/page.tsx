import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listIva } from "@/modules/withholdings/issue-iva";

export default async function RetencionesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await listIva({ companyId, userId: user.id });
  return (
    <main>
      <h1>Retenciones IVA</h1>
      <p><Link href={`/c/${companyId}/retenciones/nueva`}>Nuevo comprobante</Link></p>
      <table>
        <thead><tr><th>Comprobante</th><th>Emisión</th><th>Retenido</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td><Link href={`/c/${companyId}/retenciones/${r.id}`}>{r.certificateNumber}</Link></td><td>{r.fechaEmision}</td><td>{r.totalRetained}</td><td>{r.status}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
