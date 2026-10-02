import { DocArticle, getDocsSession } from "../../_components";

export default async function PeriodosDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount}
      current="/docs/control/periodos"
      crumb="Control · Períodos"
      section="4 · Control y reportes"
      title="Períodos"
      intro="Intervalo fiscal (mensual o quincenal) sobre el que se consolidan libros y se determina el IVA. Ciclo: open → under_review → closed, con reapertura autorizada."
      steps={[
        { title: "Crea o resuelve el período", body: "Períodos → Nuevo (año, mes, quincena si aplica) o automático al registrar documentos por fecha_fiscal. Idempotente: si existe, retorna el existente." },
        { title: "Envía a revisión", body: "El checklist automático verifica: lotes sin filas pendientes, sin duplicados ni RIF inválidos, NC con afectado, retenciones conciliadas, libros generados." },
        { title: "Cierra firmado", body: "Solo el contador: congela versiones del resumen y calcula closure_hash sobre ids + versiones. Cerrado bloquea mutaciones en app y DB." },
        { title: "Reapertura controlada", body: "Solo con motivo + responsable. Nuevas versiones de reportes; el hash anterior se conserva. Correcciones vía ajuste fiscal en período abierto." },
      ]}
      callouts={[
        { title: "Cierre bloqueado", body: <>Si el checklist está en rojo, el cierre se bloquea hasta resolver o justificar por escrito. Ruta: <code>/c/[empresa]/periodos</code>.</> },
      ]}
      prev={{ href: "/docs/datos-base/plazos", label: "Plazos" }}
      next={{ href: "/docs/control/libro-compras", label: "Libro de Compras" }}
    />
  );
}
