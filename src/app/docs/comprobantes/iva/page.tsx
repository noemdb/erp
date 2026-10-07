import { DocArticle, getDocsSession } from "../../_components";

export default async function IvaDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/comprobantes/iva"
      crumb="Comprobantes · Retenciones IVA"
      section="2 · Comprobantes"
      title="Retenciones IVA"
      intro="Comprobante que prueba que la empresa, como agente de retención, retuvo parte del IVA causado al proveedor. Un comprobante cubre N facturas (multi-línea), con numeración AAAAMMSSSSSSSS sin huecos."
      steps={[
        { title: "Prepara desde compras elegibles", body: "En Retenciones → Nueva: elige las facturas de compra del mismo proveedor y período. Solo documentos validados." },
        { title: "Revisa la previsualización", body: "Verifica montos, regla aplicada (rule_version_id) y el explanation[] paso a paso: el contador debe ver por qué se retuvo cada cifra." },
        { title: "Emite", body: "La emisión reserva el número en la misma transacción (UPDATE series RETURNING): si algo falla, no se consume número. Guarda snapshot inmutable + PDF + hash." },
        { title: "Entrega con fecha", body: "Registra fecha_emision y fecha_entrega al beneficiario. El plazo de entrega es parametizable con alertas." },
        { title: "Si hay error: anula y sustituye", body: "Emitido es inmutable: anula con motivo (no libera número) y emite sustituto con replaces_id." },
      ]}
      callouts={[
        { title: "Invariantes", body: <>iva_retenido ≤ iva_causado salvo regla explícita. Ruta: <code>/c/[empresa]/retenciones</code> y <code>/c/[empresa]/retenciones/nueva</code>.</> },
        { title: "Diferencia importada", body: "Si la retención importada difiere del cálculo del sistema, se marca para revisión: nunca se sobrescribe, el contador decide." },
      ]}
      prev={{ href: "/docs/registrar/pagos", label: "Pagos" }}
      next={{ href: "/docs/comprobantes/islr", label: "Retenciones ISLR" }}
    />
  );
}
