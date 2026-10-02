import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getPurchaseDetail } from "@/modules/fiscal-docs/service";

export default async function CompraDetallePage({ params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getPurchaseDetail({ companyId, userId: user.id }, id);
  if (!data) redirect(`/c/${companyId}/compras`);
  return (
    <main>
      <h1>Compra {data.doc.docNumber} ({data.doc.status})</h1>
      <p>Proveedor: {data.party?.razonSocial} ({data.party?.rifOriginal}) · Fiscal: {data.doc.fechaFiscal} · Total: {data.doc.total}</p>
      <h2>Líneas</h2>
      <table>
        <thead><tr><th>#</th><th>Categoría</th><th>Tasa</th><th>Base</th><th>IVA</th></tr></thead>
        <tbody>
          {data.lines.map((l) => (
            <tr key={l.id}><td>{l.lineNumber}</td><td>{l.taxCategory}</td><td>{l.taxRate ?? "—"}</td><td>{l.base}</td><td>{l.iva}</td></tr>
          ))}
        </tbody>
      </table>
      <h2>Origen</h2>
      <p>{data.origin ? `Lote ${data.origin.batchId} · archivo ${data.origin.fileName} · sha ${data.origin.sha256?.slice(0, 12)}… · fila ${data.origin.row}` : "Carga manual"}</p>
      <h2>Trazabilidad</h2>
      <ul>
        {data.trail.map((t) => (
          <li key={t.id}>{t.occurredAt?.toISOString()} — {t.action}{t.reason ? `: ${t.reason}` : ""}</li>
        ))}
      </ul>
    </main>
  );
}
