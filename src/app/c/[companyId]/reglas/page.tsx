import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listRules } from "@/modules/rules/service";

export default async function ReglasPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await listRules({ companyId, userId: user.id });
  return (
    <main>
      <h1>Reglas tributarias (borrador→revisión→aprobación→activación; la historia no se edita)</h1>
      <p><Link href={`/c/${companyId}/reglas/nueva`}>Nuevo borrador</Link></p>
      <table>
        <thead><tr><th>Tipo</th><th>%</th><th>Vigencia</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td><Link href={`/c/${companyId}/reglas/${r.id}`}>{r.ruleKind}</Link></td><td>{r.porcentaje}</td><td>{r.effectiveRange}</td><td>{r.status}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
