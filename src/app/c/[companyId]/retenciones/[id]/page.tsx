import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getIva } from "@/modules/withholdings/issue-iva";
import { VoidForm } from "./void-form";
import { DeliverForm } from "./deliver-form";
import { RenderButton } from "./render-button";

export default async function ComprobantePage({ params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getIva({ companyId, userId: user.id }, id);
  if (!data) redirect(`/c/${companyId}/retenciones`);
  return (
    <main>
      <h1>Comprobante {data.header.certificateNumber} ({data.header.status})</h1>
      <p>Emisión: {data.header.fechaEmision} · Retenido: {data.header.totalRetained} · Regla: {data.header.ruleVersionId}</p>
      <table>
        <thead><tr><th>Factura</th><th>Control</th><th>Base</th><th>IVA</th><th>Retenido</th></tr></thead>
        <tbody>
          {data.lines.map((l) => (
            <tr key={l.id}><td>{l.invoiceNumber}</td><td>{l.controlNumber}</td><td>{l.taxableBase}</td><td>{l.vatAmount}</td><td>{l.retainedAmount}</td></tr>
          ))}
        </tbody>
      </table>
      {data.header.status === "issued" && <DeliverForm companyId={companyId} id={id} />}
      <RenderButton companyId={companyId} id={id} renderStatus={data.header.renderStatus ?? "pending"} />
      {(data.header.status === "issued" || data.header.status === "delivered") && <VoidForm companyId={companyId} id={id} />}
      <p>PDF fiel en F5 (snapshot + hash ya guardados).</p>
    </main>
  );
}
