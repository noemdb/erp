import { DocArticle, getDocsSession } from "../../_components";

export default async function PlazosDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/datos-base/plazos"
      crumb="Datos base · Plazos"
      section="3 · Datos base"
      title="Plazos"
      intro="Plazos de entrega de comprobantes y declaración por período: el sistema avisa comprobantes emitidos sin entregar y períodos por cerrar."
      steps={[
        { title: "Consulta los plazos", body: "Plazos: tabla de vencimientos por tipo (entrega de comprobante, declaración IVA) según calendario fiscal configurado." },
        { title: "Atiende las alertas", body: "Comprobantes issued sin delivered y períodos open fuera de fecha aparecen destacados para el contador." },
        { title: "Entrega a tiempo", body: "Registra fecha_entrega en cada comprobante: cierra el ciclo issued → delivered y evita sanciones por entrega tardía." },
      ]}
      callouts={[
        { title: "Ruta", body: <>Todo en <code>/c/[empresa]/plazos</code>.</> },
      ]}
      prev={{ href: "/docs/datos-base/configuracion", label: "Configuración" }}
      next={{ href: "/docs/control/periodos", label: "Períodos" }}
    />
  );
}
