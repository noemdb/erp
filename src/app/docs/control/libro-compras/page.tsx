import { DocArticle, getDocsSession } from "../../_components";

export default async function LibroComprasDoc() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/control/libro-compras"
      crumb="Control · Libro de Compras"
      section="4 · Control y reportes"
      title="Libro de Compras"
      intro="Reporte fiscal cronológico de compras del período: se deriva de los documentos, nunca se edita a mano. Base del crédito fiscal."
      steps={[
        { title: "Se genera solo", body: "Reportes → Libro de Compras: elige período y formato (PDF/XLSX/CSV). Columnas según plantilla golden master, con cortes por clasificación y alícuota." },
        { title: "Navega al origen", body: "Cada total enlaza a sus documentos, y cada documento a su fila CSV y archivo origen: ¿de dónde salió? en ≤3 clics." },
        { title: "Versionado", body: "Cada emisión congela data_snapshot + sha256: regenerar un período cerrado produce el mismo hash (reproducibilidad)." },
      ]}
      callouts={[
        { title: "Ruta", body: <>Todo en <code>/c/[empresa]/reportes/libro-compras</code>. CSV neutralizado contra inyección (=, +, -, @).</> },
      ]}
      prev={{ href: "/docs/control/periodos", label: "Períodos" }}
      next={{ href: "/docs/control/libro-ventas", label: "Libro de Ventas" }}
    />
  );
}
