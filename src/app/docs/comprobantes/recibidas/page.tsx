import { DocArticle, getDocsSession } from "../../_components";

export default async function RecibidasDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount}
      current="/docs/comprobantes/recibidas"
      crumb="Comprobantes · Recibidas"
      section="2 · Comprobantes"
      title="Retenciones recibidas"
      intro="Retenciones que clientes o terceros le practicaron a la empresa: se registran como evidencia para el Resumen IVA y la conciliación, no generan numeración propia."
      steps={[
        { title: "Abre Retenciones recibidas → Nueva", body: "Registra quién retuvo, sobre qué venta, impuesto (IVA/ISLR), base, monto retenido y fechas del comprobante recibido." },
        { title: "Vincula a tus ventas", body: "Asocia el comprobante a los documentos de venta afectados para trazabilidad total → documento." },
        { title: "Revisa estados", body: "Bandejas pendiente / revisión / aplicada. El contador valida que lo retenido cuadre con tus ventas." },
        { title: "Se refleja en el resumen", body: "Las recibidas aplicadas alimentan el Resumen IVA del período como retenciones a favor." },
      ]}
      callouts={[
        { title: "Ruta", body: <>Todo en <code>/c/[empresa]/retenciones-recibidas</code> y <code>/c/[empresa]/retenciones-recibidas/nueva</code>.</> },
      ]}
      prev={{ href: "/docs/comprobantes/islr", label: "Retenciones ISLR" }}
      next={{ href: "/docs/datos-base/terceros", label: "Terceros" }}
    />
  );
}
