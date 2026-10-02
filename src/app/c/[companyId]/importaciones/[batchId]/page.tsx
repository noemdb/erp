import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getBatch } from "@/modules/imports/service";
import { ProgressBar } from "@/components/ui/progress";
import { ValidateButton } from "./validate-button";
import { ConfirmButton } from "./confirm-button";

export default async function LotePage({ params }: { params: Promise<{ companyId: string; batchId: string }> }) {
  const { companyId, batchId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getBatch({ companyId, userId: user.id }, batchId);
  if (!data) redirect(`/c/${companyId}/importaciones`);
  return (
    <main>
      <h1>Lote {data.batch.kind} ({data.batch.status})</h1>
      <p>Total: {data.batch.totalRows} · Válidas: {data.batch.validRows} · Advertencias: {data.batch.warningRows} · Rechazadas: {data.batch.rejectedRows}</p>
      {data.batch.status !== "uploaded" && data.batch.totalRows > 0 && (
        <ProgressBar
          value={data.batch.validRows}
          max={data.batch.totalRows}
          label={`Filas válidas: ${data.batch.validRows} de ${data.batch.totalRows}`}
        />
      )}
      {data.batch.status === "uploaded" && <ValidateButton companyId={companyId} batchId={batchId} />}
      {(data.batch.status === "validated" || data.batch.status === "partially_imported") && (
        <>
          <ConfirmButton companyId={companyId} batchId={batchId} />
          <p><a href={`/api/companies/${companyId}/imports/${batchId}/rejected.csv`}>Descargar rechazadas</a></p>
        </>
      )}
      <table>
        <thead><tr><th>Fila</th><th>Estado</th><th>Errores</th></tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}><td>{r.rowNumber}</td><td>{r.status}</td><td>{Array.isArray(r.errors) ? r.errors.join("; ") : "—"}</td></tr>
          ))}
        </tbody>
      </table>
      <p>Confirmación hacia documentos en F3-3.</p>
    </main>
  );
}
