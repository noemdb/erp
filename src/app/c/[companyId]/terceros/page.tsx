import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listParties } from "@/modules/parties/service";

export default async function TercerosPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await listParties({ companyId, userId: user.id });
  return (
    <main>
      <h1>Terceros</h1>
      <p><Link href={`/c/${companyId}/terceros/nuevo`}>Nuevo tercero</Link></p>
      <table>
        <thead><tr><th>RIF</th><th>Razón social</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td><Link href={`/c/${companyId}/terceros/${r.id}`}>{r.rifOriginal}</Link></td><td>{r.razonSocial}</td><td>{r.status}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
