import { DocArticle, getDocsSession } from "../../_components";

export default async function DecisionesDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount}
      current="/docs/datos-base/decisiones"
      crumb="Datos base · Decisiones"
      section="3 · Datos base"
      title="Decisiones fiscales"
      intro="Cada regla nace de una decisión firmada por el contador (RDF): qué hecho ocurrió, qué opciones había, qué se decidió y con qué números. Sin decisión firmada no se activa ninguna regla."
      steps={[
        { title: "Prepara el borrador", body: "Decisiones → Nueva: tema (G1/G2/G4/G8/G9/ISLR), pregunta en una frase y dos opciones con su impacto numérico." },
        { title: "Completa y envía a revisión", body: "En la ficha: decisión en una frase, fundamento, ejemplo numérico y resultado esperado. Luego Enviar a revisión." },
        { title: "El contador firma", body: "Aprobar → Firmar con nombre y cédula. Al firmar se congela un código sha256: lo firmado no se edita, se sustituye con un RDF nuevo." },
        { title: "Vincula y activa", body: "Vincula la regla que autoriza. Al activar la regla, la decisión pasa a aplicada: comprobante → regla → decisión, trazable." },
      ]}
      callouts={[
        { title: "Quién puede qué", body: <>Preparar: administrativo o contador. Aprobar y firmar: solo contador. El auditor solo lee.</> },
        { title: "Ruta", body: <>Todo en <code>/c/[empresa]/decisiones</code>. Exportación CSV en la bandeja.</> },
      ]}
      prev={{ href: "/docs/datos-base/reglas", label: "Reglas" }}
      next={{ href: "/docs/datos-base/configuracion", label: "Configuración" }}
    />
  );
}
