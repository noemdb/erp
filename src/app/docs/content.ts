export type DocPage = {
  title: string;
  href: string;
  available: boolean;
  description: string;
};

export type DocSection = {
  id: string;
  title: string;
  tagline: string;
  status: "disponible" | "proximamente";
  pages: DocPage[];
};

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "1",
    title: "Registrar",
    tagline: "El documento fiscal se registra una sola vez.",
    status: "disponible",
    pages: [
      {
        title: "Compras",
        href: "/docs/registrar/compras",
        available: true,
        description:
          "Facturas, notas de crédito/débito e importaciones de proveedor.",
      },
      {
        title: "Ventas",
        href: "/docs/registrar/ventas",
        available: true,
        description: "Facturas de venta y reportes Z de máquina fiscal.",
      },
      {
        title: "Pagos",
        href: "/docs/registrar/pagos",
        available: true,
        description:
          "Eventos de liquidación: pagos y abonos en cuenta asignados a compras.",
      },
    ],
  },
  {
    id: "2",
    title: "Comprobantes",
    tagline: "Retenciones multi-factura con número correlativo.",
    status: "disponible",
    pages: [
      { title: "Retenciones IVA", href: "/docs/comprobantes/iva", available: true, description: "Comprobantes de retención de IVA." },
      { title: "Retenciones ISLR", href: "/docs/comprobantes/islr", available: true, description: "Comprobantes de retención de ISLR por concepto." },
      { title: "Recibidas", href: "/docs/comprobantes/recibidas", available: true, description: "Retenciones que le practicaron a la empresa." },
    ],
  },
  {
    id: "3",
    title: "Datos base",
    tagline: "Terceros y carga inicial por lotes.",
    status: "disponible",
    pages: [
      { title: "Terceros", href: "/docs/datos-base/terceros", available: true, description: "Maestro de clientes y proveedores con RIF." },
      { title: "Importaciones", href: "/docs/datos-base/importaciones", available: true, description: "Carga masiva por CSV con staging." },
      { title: "Reglas", href: "/docs/datos-base/reglas", available: true, description: "Reglas de retención versionadas." },
      { title: "Decisiones", href: "/docs/datos-base/decisiones", available: true, description: "Decisiones fiscales firmadas que autorizan reglas." },
      { title: "Configuración", href: "/docs/datos-base/configuracion", available: true, description: "Perfil fiscal de la empresa." },
      { title: "Plazos", href: "/docs/datos-base/plazos", available: true, description: "Plazos de entrega y declaración." },
    ],
  },
  {
    id: "4",
    title: "Control y reportes",
    tagline: "Libros, resumen, períodos y bitácora.",
    status: "disponible",
    pages: [
      { title: "Períodos", href: "/docs/control/periodos", available: true, description: "Apertura, revisión y cierre fiscal." },
      { title: "Libro de Compras", href: "/docs/control/libro-compras", available: true, description: "Reporte cronológico de compras." },
      { title: "Libro de Ventas", href: "/docs/control/libro-ventas", available: true, description: "Reporte cronológico de ventas." },
      { title: "Resumen IVA", href: "/docs/control/resumen-iva", available: true, description: "Consolidación del período." },
      { title: "Bitácora", href: "/docs/control/bitacora", available: true, description: "Auditoría append-only." },
    ],
  },
  {
    id: "5",
    title: "Caso práctico",
    tagline: "Un mes completo de punta a punta, con cifras reales de la simulación.",
    status: "disponible",
    pages: [
      { title: "La historia", href: "/docs/caso-practico/resumen", available: true, description: "Los protagonistas y el mes en una mirada." },
      { title: "La carga del mes", href: "/docs/caso-practico/carga", available: true, description: "Del archivo a los documentos, paso a paso." },
      { title: "Pagos y comprobantes", href: "/docs/caso-practico/comprobacion", available: true, description: "El pago, las activaciones y los cálculos revisados." },
      { title: "Cierre y consistencia", href: "/docs/caso-practico/cierre", available: true, description: "Bitácora, pruebas y lista de cierre." },
    ],
  },
];
