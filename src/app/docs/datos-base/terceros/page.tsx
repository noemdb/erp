import { DocArticle, getDocsSession } from "../../_components";

export default async function TercerosDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/datos-base/terceros"
      crumb="Datos base · Terceros"
      section="3 · Datos base"
      title="Terceros"
      intro="Maestro de personas naturales o jurídicas con las que opera la empresa: clientes, proveedores o ambos. El RIF se valida y se conserva original + normalizado."
      steps={[
        { title: "Crea el tercero", body: "Terceros → Nuevo: RIF, razón social y dirección fiscal. El RIF se preserva con formato original y se guarda normalizado para búsqueda." },
        { title: "Define su perfil fiscal", body: "Tipo de persona, residente, condición IVA, sujeto a retención IVA/ISLR. Los cambios agregan vigencia, no sobrescriben." },
        { title: "Úsalo en documentos", body: "Un mismo tercero sirve para compras y ventas; el rol lo define cada operación, no el maestro." },
        { title: "Inactivos bloquean", body: "Un tercero inactivo no acepta documentos nuevos, pero conserva su historial." },
      ]}
      callouts={[
        { title: "Ruta", body: <>Todo en <code>/c/[empresa]/terceros</code> y <code>/c/[empresa]/terceros/nuevo</code>. Unicidad por (empresa, RIF) en activos.</> },
      ]}
      prev={{ href: "/docs/comprobantes/recibidas", label: "Recibidas" }}
      next={{ href: "/docs/datos-base/importaciones", label: "Importaciones" }}
    />
  );
}
