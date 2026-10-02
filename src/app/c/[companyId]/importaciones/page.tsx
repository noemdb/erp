import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listBatches } from "@/modules/imports/service";

export default async function ImportacionesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await listBatches({ companyId, userId: user.id });
  return (
    <main>
      <h1>Importaciones</h1>
      <p><Link href={`/c/${companyId}/importaciones/nueva`}>Subir CSV</Link></p>
      <table>
        <thead><tr><th>Tipo</th><th>Fuente</th><th>Estado</th><th>Filas</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td><Link href={`/c/${companyId}/importaciones/${r.id}`}>{r.kind}</Link></td><td>{r.sourceSystem}</td><td>{r.status}</td><td>{r.totalRows}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
