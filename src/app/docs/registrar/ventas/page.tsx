import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DocsShell, DocCallout, StepList, getDocsSession } from "../../_components";

const STEPS = [
  { title: "Abre Ventas → Nueva", body: "Desde el panel de tu empresa: Ventas → Nueva venta. Para máquinas fiscales usa el flujo de Reporte Z." },
  { title: "Elige el tipo", body: "Factura, reporte Z (z_summary con rango desde-hasta), NC, ND, exportación o venta por cuenta de terceros." },
  { title: "Modo factura o Z", body: "Configurable por empresa/sucursal: no mezcles facturas individuales y Z en el mismo período y sucursal." },
  { title: "Cliente y fechas", body: "Tercero cliente, fecha_documento y fecha_fiscal. La fiscal define el período del Libro de Ventas." },
  { title: "Montos y débito fiscal", body: "base_imponible + iva_causado = total. El IVA de ventas es débito fiscal: origina lo que la empresa cobra." },
];

export default async function VentasDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocsShell user={user} companyCount={companyCount} current="/docs/registrar/ventas" breadcrumb={<><span aria-hidden>/</span><span className="text-periwinkle-900">Registrar · Ventas</span></>}>
      <Badge variant="outline">1 · Registrar</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Ventas</h1>
      <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">Toda venta con relevancia tributaria: factura individual o consolidado diario Z. Alimenta el Libro de Ventas y el Resumen IVA (débitos).</p>
      <div className="mt-6"><StepList steps={STEPS} /></div>
      <div className="mt-6 space-y-3">
        <DocCallout title="Reporte Z">Trae rango de facturas (range_from → range_to). Saltos de numeración generan advertencia para el contador, no bloquean el lote. Rutas: <code>/c/[empresa]/ventas</code>, <code>/c/[empresa]/ventas/nueva</code>, <code>/c/[empresa]/ventas/z</code>.</DocCallout>
        <DocCallout title="Exportaciones y terceros">Exportación: alícuota 0 % con tratamiento propio en el resumen. Venta por cuenta de terceros: la empresa es intermediaria, clasificación propia.</DocCallout>
      </div>
      <p className="mt-6 flex gap-4 text-sm"><Link href="/docs/registrar/compras" className="text-periwinkle-500 hover:text-[#120c27]">← Compras</Link><Link href="/docs/registrar/pagos" className="font-semibold text-[#352574] hover:underline">Siguiente: Pagos →</Link></p>
    </DocsShell>
  );
}
