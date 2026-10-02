import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listPeriods } from "@/modules/periods/service";

export default async function ResumenIvaIndex({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const periods = await listPeriods({ companyId, userId: user.id });
  return (
    <main>
      <h1>Resumen IVA por período</h1>
      <ul>
        {periods.map((p) => (
          <li key={p.id}><Link href={`/c/${companyId}/reportes/resumen-iva/${p.id}`}>{p.range} ({p.status})</Link></li>
        ))}
      </ul>
    </main>
  );
}
