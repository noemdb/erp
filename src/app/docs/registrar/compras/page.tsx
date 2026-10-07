import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DocsShell, DocCallout, StepList, getDocsSession } from "../../_components";

const STEPS = [
  { title: "Abre Compras → Nueva", body: "Desde el panel de tu empresa: Compras → Nueva compra. O importa por lote en Importaciones si son muchas." },
  { title: "Elige el tipo", body: "Factura, nota de crédito (NC), nota de débito (ND), importación o exenta. NC/ND exigen el documento afectado: sin factura original no son válidas." },
  { title: "Identifica al proveedor", body: "Tercero con RIF válido. Si no existe, créalo antes en Terceros. Un tercero inactivo no acepta documentos nuevos." },
  { title: "Fechas correctas", body: "fecha_documento (emisión), fecha_recepcion (cuándo la recibiste) y fecha_fiscal (período al que pertenece). La fecha de registro nunca sustituye a la fiscal." },
  { title: "Montos: base + IVA = total", body: "base_imponible + iva_causado (+ exento si aplica) debe cuadrar con el total. El sistema lo valida y rechaza con TOTAL_MISMATCH si no cuadra." },
  { title: "Guarda y verifica", body: "El documento alimenta el Libro de Compras y queda disponible para retenciones. En período cerrado no se edita: solo reapertura o ajuste." },
];

export default async function ComprasDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocsShell user={user} companyCount={companyCount} canManageUsers={canManageUsers} current="/docs/registrar/compras" breadcrumb={<><span aria-hidden>/</span><span className="text-periwinkle-900">Registrar · Compras</span></>}>
      <Badge variant="outline">1 · Registrar</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Compras</h1>
      <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">El hecho fiscal de compra se registra una sola vez: factura con número y número de control, NC/ND vinculadas, importaciones con su régimen. De aquí derivan Libro de Compras, retenciones y Resumen IVA.</p>
      <div className="mt-6"><StepList steps={STEPS} /></div>
      <div className="mt-6 space-y-3">
        <DocCallout title="Reglas que te protegen">Duplicados por (proveedor + tipo + factura + control) se detectan y no se sobrescriben. NC no puede exceder el saldo del documento afectado. Rutas: <code>/c/[empresa]/compras</code>, <code>/c/[empresa]/compras/nueva</code>.</DocCallout>
        <DocCallout title="Errores frecuentes">TOTAL_MISMATCH: revisa base e IVA. MISSING_AFFECTED_DOCUMENT: la NC/ND necesita su factura. PERIOD_CLOSED: pide reapertura al contador. DUPLICATE_DOCUMENT: el documento ya existe.</DocCallout>
      </div>
      <p className="mt-6 text-sm"><Link href="/docs/registrar/pagos" className="font-semibold text-[#352574] hover:underline">Siguiente: Pagos →</Link></p>
    </DocsShell>
  );
}
