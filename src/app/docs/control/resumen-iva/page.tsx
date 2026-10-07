import { DocArticle, getDocsSession } from "../../_components";

export default async function ResumenDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/control/resumen-iva"
      crumb="Control · Resumen IVA"
      section="4 · Control y reportes"
      title="Resumen IVA"
      intro="Consolidación del período: débitos, créditos, exentas, exportaciones, importaciones, ajustes, excedente anterior, retenciones aplicadas y cuota. Insumo para la declaración (no es la declaración)."
      steps={[
        { title: "Revisa la consolidación", body: "Reportes → Resumen IVA: verifica cada bloque y sus controles F8. Todo hallazgo se resuelve o se justifica por escrito." },
        { title: "Concilia a cero", body: "La conciliación libros ↔ resumen ↔ comprobantes debe cuadrar con tolerancia 0 (salvo ADR de redondeo)." },
        { title: "Congela la versión", body: "Resumen IVA → Congelar: snapshot + sha256 antes del cierre. Regenerar debe dar el mismo hash." },
        { title: "Cierra el período", body: "Con el resumen congelado y el checklist verde, el contador cierra en Períodos." },
      ]}
      callouts={[
        { title: "Drill-down", body: <>Cada total del resumen enlaza a sus documentos origen. Rutas: <code>/c/[empresa]/reportes/resumen-iva</code>.</> },
      ]}
      prev={{ href: "/docs/control/libro-ventas", label: "Libro de Ventas" }}
      next={{ href: "/docs/control/bitacora", label: "Bitácora" }}
    />
  );
}
