import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { getSalesBook } from "@/modules/sales/service";

export default async function LibroVentasPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await getSalesBook({ companyId, userId: user.id });
  const tot = (k: "baseImponible" | "ivaCausado" | "total") => rows.reduce((a, r) => a + Number(r[k]), 0).toFixed(2);
  return (
    <main>
      <h1>Libro de Ventas (provisional F2 — modo factura; modo Z en F3)</h1>
      <p><a href={`/api/companies/${companyId}/reports/sales-book?format=csv`}>Descargar CSV</a></p>
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>RIF</th><th>Razón</th><th>Factura</th><th>Base</th><th>IVA</th><th>Total</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.docNumber}><td>{r.fechaFiscal}</td><td>{r.kind}</td><td>{r.rif}</td><td>{r.razonSocial}</td><td>{r.docNumber}</td><td>{r.baseImponible}</td><td>{r.ivaCausado}</td><td>{r.total}</td></tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={5}>Totales</td><td>{tot("baseImponible")}</td><td>{tot("ivaCausado")}</td><td>{tot("total")}</td></tr></tfoot>
      </table>
    </main>
  );
}
