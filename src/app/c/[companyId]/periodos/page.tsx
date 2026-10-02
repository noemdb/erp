import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listPeriods } from "@/modules/periods/service";

export default async function PeriodosPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await listPeriods({ companyId, userId: user.id });
  return (
    <main>
      <h1>Períodos fiscales</h1>
      <p>Se crean solos al registrar compras del mes. Checklist completo de cierre en F6.</p>
      <table>
        <thead><tr><th>Rango</th><th>Estado</th><th>Hash cierre</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td><Link href={`/c/${companyId}/periodos/${r.id}`}>{r.range}</Link></td><td>{r.status}</td><td>{r.closureHash?.slice(0, 12) ?? "—"}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
