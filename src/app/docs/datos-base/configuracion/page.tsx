import { DocArticle, getDocsSession } from "../../_components";

export default async function ConfigDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount}
      current="/docs/datos-base/configuracion"
      crumb="Datos base · Configuración"
      section="3 · Datos base"
      title="Configuración"
      intro="Perfil fiscal de la empresa: RIF, razón social, domicilio, condición IVA, contribuyente especial, agente de retención IVA/ISLR y tipo de período (mensual o quincenal)."
      steps={[
        { title: "Completa el perfil", body: "Configuración: datos fiscales y condiciones (agente IVA / agente ISLR son independientes). Todo cambio queda auditado con antes/después." },
        { title: "Elige tipo de período", body: "Mensual o quincenal por empresa (G1). No se mezclan, y no puede cambiarse si ya hay períodos cerrados." },
        { title: "Modo de ventas", body: "Define si el Libro de Ventas se alimenta por factura individual o por Reporte Z, por empresa/sucursal." },
        { title: "Criterio G2 ISLR", body: "El contador fija payment_only o account_credit_or_payment con motivo; mientras esté unset solo convergen pagos estrictos." },
      ]}
      callouts={[
        { title: "Solo admin/contador", body: <>Cambios de perfil fiscal exigen rol autorizado y se registran en bitácora. Ruta: <code>/c/[empresa]/configuracion</code>.</> },
      ]}
      prev={{ href: "/docs/datos-base/reglas", label: "Reglas" }}
      next={{ href: "/docs/datos-base/plazos", label: "Plazos" }}
    />
  );
}
