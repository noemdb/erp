import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { getSalesBook } from "@/modules/sales/service";

export default async function VentasPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await getSalesBook({ companyId, userId: user.id });
  return (
    <main>
      <h1>Ventas</h1>
      <p><Link href={`/c/${companyId}/ventas/nueva`}>Nueva venta</Link> · <Link href={`/c/${companyId}/reportes/libro-ventas`}>Libro de Ventas</Link></p>
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>RIF</th><th>Factura</th><th>Base</th><th>IVA</th><th>Total</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.docNumber}><td>{r.fechaFiscal}</td><td>{r.kind}</td><td>{r.rif}</td><td>{r.docNumber}</td><td>{r.baseImponible}</td><td>{r.ivaCausado}</td><td>{r.total}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
