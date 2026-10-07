import { DocArticle, getDocsSession } from "../../_components";

export default async function ReglasDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/datos-base/reglas"
      crumb="Datos base · Reglas"
      section="3 · Datos base"
      title="Reglas"
      intro="Parámetros versionados de retención (porcentaje, sustraendo, base, condiciones) con vigencia. La semántica vive en código; la regla aporta datos. Todo cálculo guarda su rule_version_id."
      steps={[
        { title: "Crea borrador", body: "Reglas → Nueva: tipo (IVA/ISLR), concepto si aplica, porcentaje, sustraendo, vigencia y fuente normativa." },
        { title: "Revisa y aprueba", body: "Flujo borrador → revisión → aprobación → activación. Activar cierra la anterior sin editarla: el historial nunca se reescribe." },
        { title: "Sin solapamientos", body: "Dos reglas del mismo tipo y concepto no pueden solaparse en vigencia (constraint EXCLUDE en DB)." },
        { title: "Todo cálculo cita su regla", body: "Cada comprobante guarda rule_version_id + snapshot de parámetros: siempre se sabe con qué regla se calculó." },
      ]}
      callouts={[
        { title: "Solo contador", body: <>Crear y activar reglas exige rol contador. El 75 % de IVA inicial es un seed, no una constante.</> },
        { title: "Ruta", body: <>Todo en <code>/c/[empresa]/reglas</code> y <code>/c/[empresa]/reglas/nueva</code>.</> },
      ]}
      prev={{ href: "/docs/datos-base/importaciones", label: "Importaciones" }}
      next={{ href: "/docs/datos-base/configuracion", label: "Configuración" }}
    />
  );
}
