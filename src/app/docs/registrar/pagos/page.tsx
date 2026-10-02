import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DocsShell, DocCallout, StepList, getDocsSession } from "../../_components";

const STEPS = [
  { title: "Abre Pagos → Nuevo", body: "Registra el evento de liquidación: pago o abono en cuenta, con fecha efectiva, monto y referencia." },
  { title: "No infieras abonos", body: "El sistema no crea abonos solo. Si el abono contable ocurrió antes del pago, regístralo explícito con su fecha (fecha_abono_en_cuenta)." },
  { title: "Asigna a compras", body: "En el detalle del evento, asigna a una o varias compras del mismo proveedor. La suma asignada no supera el evento ni el total de la compra." },
  { title: "Retención nace del evento", body: "Registrar/asignar no emite retención sola. La retención ISLR se emite aparte y usa el evento como disparador (pago o abono, lo que ocurra primero)." },
  { title: "Revisa criterio G2", body: "Si la empresa está en unset, solo pagos asignados convergentes emiten. Abonos o divergencias se bloquean con G2_EVENT_REVIEW_REQUIRED hasta definir criterio." },
];

export default async function PagosDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocsShell user={user} companyCount={companyCount} current="/docs/registrar/pagos" breadcrumb={<><span aria-hidden>/</span><span className="text-periwinkle-900">Registrar · Pagos</span></>}>
      <Badge variant="outline">1 · Registrar</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Pagos</h1>
      <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">Evento de liquidación (no tesorería): el hecho de pagar o abonar. Dispara retenciones de ISLR y deja trazabilidad evento → compra → comprobante.</p>
      <div className="mt-6"><StepList steps={STEPS} /></div>
      <div className="mt-6 space-y-3">
        <DocCallout title="Fechas que importan">fecha_pago vs fecha_abono_en_cuenta: para retener vale la primera que ocurra. Guardar el evento no calcula retención; la previsualización compara escenarios antes de emitir.</DocCallout>
        <DocCallout title="Rutas">Rutas: <code>/c/[empresa]/pagos</code>, <code>/c/[empresa]/pagos/nuevo</code>, detalle <code>/c/[empresa]/pagos/[id]</code> para asignar. Tras emitir ISLR no se crean eventos anteriores del beneficiario sin anular primero.</DocCallout>
      </div>
      <p className="mt-6 flex gap-4 text-sm"><Link href="/docs/registrar/ventas" className="text-periwinkle-500 hover:text-[#120c27]">← Ventas</Link><Link href="/docs" className="font-semibold text-[#352574] hover:underline">Volver al índice →</Link></p>
    </DocsShell>
  );
}
