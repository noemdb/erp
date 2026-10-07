import { DocArticle, getDocsSession } from "../../_components";

export default async function ImportacionesDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/datos-base/importaciones"
      crumb="Datos base · Importaciones"
      section="3 · Datos base"
      title="Importaciones"
      intro="Carga masiva por CSV para migrar desde Excel o legacy: el archivo pasa por staging (lote → filas → validación → confirmación) con idempotencia por sha256."
      steps={[
        { title: "Sube el CSV", body: "Importaciones → Nueva: indica tipo (compras, ventas, Z) y fuente. Si el archivo ya se subió (mismo sha256), retorna el lote existente sin duplicar." },
        { title: "Valida el lote", body: "Abre el lote → Validar: cada fila queda pending, valid, warning o rejected con su error (RIF inválido, total que no cuadra, duplicado, tercero inexistente)." },
        { title: "Corrige rechazadas", body: "Descarga el CSV de rechazadas, corrige y vuelve a subir. O confirma solo válidas (partially_imported)." },
        { title: "Confirma", body: "Confirmar convierte filas válidas en documentos definitivos con trazabilidad a archivo + número de fila. Archivos grandes van en cola con progreso." },
      ]}
      callouts={[
        { title: "Plantillas", body: <>Descarga el CSV modelo con columnas canónicas + fila de ejemplo desde la pantalla de importaciones.</> },
        { title: "Retenciones importadas", body: <>Si la retención importada difiere del cálculo del sistema, se marca para revisión del contador: nunca se sobrescribe.</> },
      ]}
      prev={{ href: "/docs/datos-base/terceros", label: "Terceros" }}
      next={{ href: "/docs/datos-base/reglas", label: "Reglas" }}
    />
  );
}
