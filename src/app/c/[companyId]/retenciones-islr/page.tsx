import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listIslr } from "@/modules/withholdings/issue-islr";
import { getAbonoCriterion } from "@/modules/withholdings/g2-criterion";
import { AbonoCriterionForm } from "./abono-criterion-form";

export default async function RetencionesIslrPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const companyContext = await getCompanyContext(companyId, user.id);
  if (!companyContext) redirect("/dashboard");
  const rows = await listIslr({ companyId, userId: user.id });
  const criterion = await getAbonoCriterion({ companyId, userId: user.id });
  return (
    <main>
      <h1>Retenciones ISLR (serie provisional hasta G9)</h1>
      <p><Link href={`/c/${companyId}/retenciones-islr/nueva`}>Nuevo comprobante</Link></p>
      {companyContext.role === "contador" && <AbonoCriterionForm companyId={companyId} criterion={criterion} />}
      {companyContext.role !== "contador" && <p>Criterio G2: {criterion}</p>}
      <table>
        <thead><tr><th>Comprobante</th><th>Emisión</th><th>Retenido</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td><Link href={`/c/${companyId}/retenciones-islr/${r.id}`}>{r.certificateNumber}</Link></td><td>{r.fechaEmision}</td><td>{r.totalRetained}</td><td>{r.status}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
