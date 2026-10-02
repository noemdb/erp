import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listPeriods } from "@/modules/periods/service";
import { getCloseChecklist } from "@/modules/periods/checklist";
import { PeriodButtons } from "../../periodos/period-buttons";

export default async function PeriodoDetallePage({ params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const ctx = { companyId, userId: user.id };
  const periods = await listPeriods(ctx);
  const per = periods.find((p) => p.id === id);
  if (!per) redirect(`/c/${companyId}/periodos`);
  const check = await getCloseChecklist(ctx, id);
  return (
    <main>
      <h1>Período {per.range} ({per.status})</h1>
      <h2>Checklist de cierre ({check.ready ? "listo" : "pendiente"})</h2>
      <ul>
        {check.items.map((i) => (
          <li key={i.key}>{i.ok ? "✓" : "✗"} {i.detalle}</li>
        ))}
      </ul>
      <PeriodButtons companyId={companyId} periodId={id} status={per.status} />
    </main>
  );
}
