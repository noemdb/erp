import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getIslr } from "@/modules/withholdings/issue-islr";
import { VoidIslrForm } from "./void-form";

export default async function IslrDetallePage({ params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getIslr({ companyId, userId: user.id }, id);
  if (!data) redirect(`/c/${companyId}/retenciones-islr`);
  return (
    <main>
      <h1>Comprobante {data.header.certificateNumber} ({data.header.status})</h1>
      <p>Emisión: {data.header.fechaEmision} · Retenido: {data.header.totalRetained} · Regla: {data.header.ruleVersionId}</p>
      <table>
        <thead><tr><th>Base</th><th>%</th><th>Sustraendo</th><th>Retenido</th></tr></thead>
        <tbody>
          {data.lines.map((l) => (
            <tr key={l.id}><td>{l.baseSujeta}</td><td>{l.porcentaje}</td><td>{l.sustraendo}</td><td>{l.retainedAmount}</td></tr>
          ))}
        </tbody>
      </table>
      {(data.header.status === "issued" || data.header.status === "delivered") && <VoidIslrForm companyId={companyId} id={id} />}
    </main>
  );
}
