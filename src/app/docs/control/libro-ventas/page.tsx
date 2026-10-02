import { DocArticle, getDocsSession } from "../../_components";

export default async function LibroVentasDoc() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocArticle
      user={user}
      companyCount={companyCount}
      current="/docs/control/libro-ventas"
      crumb="Control · Libro de Ventas"
      section="4 · Control y reportes"
      title="Libro de Ventas"
      intro="Reporte fiscal cronológico de ventas del período, en modo factura individual o Reporte Z según la empresa. Origen del débito fiscal."
      steps={[
        { title: "Se genera solo", body: "Reportes → Libro de Ventas: período + formato. Respeta el modo configurado (factura o Z) sin mezclar en la misma sucursal." },
        { title: "Incluye Z y casos propios", body: "Reportes Z con su rango, exportaciones (alícuota 0 %) y ventas por cuenta de terceros con clasificación propia." },
        { title: "Descarga y archiva", body: "PDF/XLSX/CSV con snapshot + sha256 para reproducibilidad ante fiscalización." },
      ]}
      callouts={[
        { title: "Ruta", body: <>Todo en <code>/c/[empresa]/reportes/libro-ventas</code>.</> },
      ]}
      prev={{ href: "/docs/control/libro-compras", label: "Libro de Compras" }}
      next={{ href: "/docs/control/resumen-iva", label: "Resumen IVA" }}
    />
  );
}
