import { DocArticle, getDocsSession } from "../../_components";

export default async function DecisionesDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/datos-base/decisiones"
      crumb="Datos base · Decisiones"
      section="3 · Datos base"
      title="Decisiones fiscales"
      intro="Cada regla nace de una decisión firmada por el contador (RDF): qué hecho ocurrió, qué opciones había, qué se decidió y con qué números. Sin decisión firmada no se activa ninguna regla."
      steps={[
        { title: "1 · Abre la bandeja", body: "Panel → Decisiones: ves tus decisiones por estado (borrador, en revisión, aprobada, firmada, aplicada) con su código RDF-AAAA-#### único por empresa. El contador ve el botón Nueva; el resto solo lee." },
        { title: "2 · Crea el borrador", body: "Decisiones → Nueva: tema (G1/G2/G4/G8/G9/ISLR), pregunta en una frase y dos opciones A/B con su impacto numérico. El administrativo puede prepararlo; el contador lo completa." },
        { title: "3 · Completa la ficha", body: "En la ficha: decisión en una frase, fundamento normativo (providencia/decreto/artículo), fórmula, ejemplo numérico con resultado esperado, vigencia prevista y cobertura (impuesto + concepto). Luego Enviar a revisión." },
        { title: "4 · Aprueba (solo contador)", body: "Revisa hecho contra fuente primaria, números del ejemplo y cobertura. Si algo no cuadra, Devuelve con motivo; si cuadra, Aprueba. Todo queda en bitácora con antes/después." },
        { title: "5 · Firma (solo contador)", body: "Firmar con nombre y documento. Al firmar se congela un código sha256 del contenido: lo firmado no se edita jamás. Si hay que corregir, nace un RDF nuevo que cita al anterior (sustituye, no borra)." },
        { title: "6 · Vincula la regla", body: "Desde la ficha: Vincular regla con rol autoriza (o aclara/deroga). La cobertura exige misma empresa, mismo impuesto y mismo concepto — sin ella, el paso siguiente se niega." },
        { title: "7 · Activa y verifica", body: "Al activar la regla con cobertura, la decisión pasa a aplicada en la misma transacción. Verifica la cadena: comprobante → regla (rule_version_id) → decisión firmada. Sin cobertura, el sistema responde GATE_NO_RDF." },
      ]}
      callouts={[
        { title: "Quién puede qué", body: <>Preparar y enviar: administrativo o contador. Aprobar, firmar, vincular y activar: solo contador. Auditor: solo lectura. Sin membresía en la empresa no se ve nada.</> },
        { title: "Ejemplo completo: G9 serie ISLR", body: <>Hoja <code>docs/anexos/hoja-firma-G9-ISLR.md</code>: <strong>opción A</strong> adopta <code>ISLR-AAAAMM-######</code> como permanente (sin migración; lo emitido en piloto queda válido); <strong>opción B</strong> anexa ejemplo y planifica convivencia. Firmada la A, el correlativo y R-E6 dejan de ser provisionales y el banner BORRADOR desaparece de los PDF nuevos.</> },
        { title: "Sin firma no hay producción", body: <>Mientras G9/matriz sigan sin firmar, los comprobantes ISLR salen con marca BORRADOR y las reglas sintéticas de prueba nunca activan en producción. Es diseño fail-closed, no error: el sistema se niega antes que emitir sin respaldo.</> },
        { title: "Dónde seguir", body: <>Estado por gate en <code>/c/[empresa]/estado-fiscal</code> · Hoja firmable en anexos · Casos V-2 (G9), V-3 (matriz) y V-4 (flujo RDF) en <code>/casos-uso</code> con diagramas. Exportación CSV en la bandeja.</> },
        { title: "Ruta", body: <>Todo en <code>/c/[empresa]/decisiones</code> (bandeja, nueva, ficha por id). Acciones auditadas en la misma transacción que el cambio de estado.</> },
      ]}
      prev={{ href: "/docs/datos-base/reglas", label: "Reglas" }}
      next={{ href: "/docs/datos-base/configuracion", label: "Configuración" }}
    />
  );
}
