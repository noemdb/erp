import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getReceived } from "@/modules/received/service";
import { listPeriods } from "@/modules/periods/service";
import { FlowButtons } from "./flow-buttons";

export default async function RecibidaDetallePage({ params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getReceived({ companyId, userId: user.id }, id);
  if (!data) redirect(`/c/${companyId}/retenciones-recibidas`);
  const periods = await listPeriods({ companyId, userId: user.id });
  return (
    <main>
      <h1>{data.header.agentRazon} — {data.header.certificateNumber} ({data.header.status})</h1>
      <p>Retenido: {data.header.montoRetenido} · IVA facturas: {data.header.ivaCausado}</p>
      <ul>
        {data.docs.map((d) => (
          <li key={d.id}>{d.docNumber} ({d.total})</li>
        ))}
      </ul>
      <FlowButtons companyId={companyId} id={id} status={data.header.status} periods={periods.map((p) => ({ id: p.id, range: p.range, status: p.status }))} />
    </main>
  );
}
