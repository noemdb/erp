import { DocArticle, getDocsSession } from "../../_components";

export default async function BitacoraDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount}
      current="/docs/control/bitacora"
      crumb="Control · Bitácora"
      section="4 · Control y reportes"
      title="Bitácora"
      intro="Registro append-only de hechos de dominio (quién, qué, cuándo, antes/después): se escribe en la misma transacción que produce el cambio y no admite edición ni borrado."
      steps={[
        { title: "Consulta por entidad", body: "Auditoría: filtra por tipo de entidad, id o rango de fechas. Todos los roles leen; el auditor es solo lectura." },
        { title: "Traza cualquier cifra", body: "Desde un total → documento → fila CSV → archivo origen → evento de auditoría con actor y motivo." },
        { title: "Exporta evidencia", body: "Bitácora exportable a CSV para fiscalización o auditoría externa." },
      ]}
      callouts={[
        { title: "Inmutable por diseño", body: <>La DB revoca UPDATE/DELETE al rol de app sobre audit_events. Sin PII en logs. Ruta: <code>/c/[empresa]/auditoria</code>.</> },
      ]}
      prev={{ href: "/docs/control/resumen-iva", label: "Resumen IVA" }}
    />
  );
}
