import { DocArticle, getDocsSession } from "../../_components";

export default async function IslrDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount}
      current="/docs/comprobantes/islr"
      crumb="Comprobantes · Retenciones ISLR"
      section="2 · Comprobantes"
      title="Retenciones ISLR"
      intro="Retención sobre pagos por concepto (honorarios, alquileres, comisiones…): fórmula max(0, base × % − sustraendo). Nace del evento de liquidación (pago o abono, lo que ocurra primero)."
      steps={[
        { title: "Registra y asigna el evento", body: "Primero el pago o abono en Pagos, asignado a sus compras. Sin evento asignado no hay disparador válido." },
        { title: "Compara escenarios (G2)", body: "La previsualización muestra fecha efectiva, período, regla, porcentaje, sustraendo y monto. Con criterio unset, ambos escenarios deben converger o se bloquea." },
        { title: "Elige concepto de pago", body: "El concepto determina porcentaje y sustraendo según vigencia. Verifica tipo de beneficiario y condiciones." },
        { title: "Emite y entrega", body: "Numeración por serie propia de la empresa; snapshot + PDF + hash. Registra entrega al beneficiario." },
        { title: "Corrige anulando", body: "Tras emitir, no se crean eventos anteriores del beneficiario sin anular primero el comprobante y revisar el caso." },
      ]}
      callouts={[
        { title: "Criterio G2", body: <>Configurable por el contador (payment_only o account_credit_or_payment) con motivo auditado. Elegirlo es operativo, no aprobación legal. Ruta: <code>/c/[empresa]/retenciones-islr</code>.</> },
        { title: "Sustraendo mayor", body: "Si sustraendo > base × %, el resultado es 0 (nunca negativo)." },
      ]}
      prev={{ href: "/docs/comprobantes/iva", label: "Retenciones IVA" }}
      next={{ href: "/docs/comprobantes/recibidas", label: "Recibidas" }}
    />
  );
}
