/** Contenido de Casos de Uso (R-O1…R-E8). Cifras y terceros 100% ficticios. */
import type { FlowProcess } from "../docs/_flows";

export type Caso = {
  id: string;
  title: string;
  body: string;
  steps: string[];
  ejemplo: { title: string; lines: string[] };
  pantalla: string;
  estado: { label: string; ok: boolean; note?: string };
  /** Diagrama interactivo del caso (botón Ver flujo). */
  flow?: FlowProcess;
};

export type Regimen = {
  id: string;
  rol: string;
  badge: string;
  intro: string;
  fns: Caso[];
};

export const REGIMENES: Regimen[] = [
  {
    id: "ordinario",
    rol: "Contribuyente Ordinario",
    badge: "Cierre mensual",
    intro:
      "Empresas con período mensual: todo se consolida por mes calendario. Cuatro reportes al cerrar cada mes.",
    fns: [
      {
        id: "r-o1",
        title: "R-O1 · Libro de Compras + totales (mensual)",
        body: "Reporte cronológico de las compras del mes: facturas, notas de crédito/débito con documento afectado, importaciones y operaciones exentas o sin derecho a crédito. Se deriva de los documentos: nunca se edita a mano.",
        steps: [
          "Panel → Períodos: ubica el mes (p. ej. 2026-01 = 01-01 → 01-02) y confirma que está abierto.",
          "Panel → Compras → Nueva (o Importaciones → Subir CSV): registra cada compra con su fecha fiscal de enero; las NC/ND exigen documento afectado.",
          "Panel → Reportes → Libro de Compras: elige el período y revisa línea por línea (proveedor/RIF, factura, control, base, IVA, total).",
          "Verifica la fila de totales por alícuota/clasificación; ante una diferencia usa el desglose total → documento → fila CSV.",
          "Descarga CSV de respaldo (y PDF/Excel cuando el formato esté aprobado con el contador).",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · enero 2026",
          lines: [
            "Proveedor Ejemplo, C.A. · RIF J-99999999-9 · F-0001 / control 00-0001",
            "Base 10.000,00 + IVA 1.600,00 = total 11.600,00 (alícuota 16%)",
            "Libro de enero totaliza: base 10.000,00 · IVA 1.600,00 · 1 documento",
          ],
        },
        pantalla: "Panel → Compras → Reportes → Libro de Compras",
        estado: { label: "Disponible", ok: true },
        flow: "r-o1-libro-compras",
      },
      {
        id: "r-o2",
        title: "R-O2 · Libro de Ventas + totales (mensual)",
        body: "Reporte cronológico de las ventas del mes, por factura individual o por reporte Z de máquina fiscal, según el modo configurado por empresa y sucursal. Ambos modos no se mezclan en el mismo período.",
        steps: [
          "Panel → Configuración: confirma el modo de ventas de cada sucursal (facturas o Z).",
          "Panel → Ventas → Nueva (o importa el Z con su rango de facturas en Importaciones).",
          "Panel → Reportes → Libro de Ventas: elige el mes y revisa líneas + totales por alícuota.",
          "Si el Z trae saltos de numeración, quedan marcados con advertencia para el contador.",
          "Descarga CSV de respaldo.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · enero 2026",
          lines: [
            "Cliente Ejemplo, S.R.L. · F-V001 · base 20.000,00 + IVA 3.200,00 = 23.200,00",
            "Libro de enero totaliza: base 20.000,00 · IVA (débito) 3.200,00",
          ],
        },
        pantalla: "Panel → Ventas → Reportes → Libro de Ventas",
        estado: { label: "Disponible", ok: true, note: "Fuente por sucursal (factura/Z) pendiente de confirmar con el cliente (G7)." },
        flow: "r-o2-libro-ventas",
      },
      {
        id: "r-o3",
        title: "R-O3 · Resumen de IVA (mensual)",
        body: "Consolidación del mes: débitos de ventas, créditos de compras, exentas, exportaciones, ajustes, excedente anterior, retenciones que te realizaron y cuota del período. Es el insumo para declarar, no la declaración.",
        steps: [
          "Cierra la carga: libros de compras y ventas del mes completos y sin filas pendientes.",
          "Panel → Reportes → Resumen IVA: elige el mes; revisa débitos, créditos, excedente y cuota.",
          "Si te retuvieron (retenciones recibidas), concílialas: aparecen como línea informativa, sin neteo automático.",
          "Panel → Reportes → Conciliación: verifica libros ↔ resumen ↔ comprobantes (tolerancia provisional 0,01).",
          "El contador congela la versión del resumen: regenerarla después debe dar la misma huella.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · enero 2026",
          lines: [
            "Débito 3.200,00 − crédito 1.600,00 = cuota 1.600,00",
            "Retención recibida 200,00 conciliada como línea informativa (no resta sola)",
          ],
        },
        pantalla: "Panel → Reportes → Resumen IVA → Conciliación",
        estado: { label: "Disponible", ok: true, note: "Excedentes y tolerancia final dependen de matriz v1 y redondeo G8." },
        flow: "r-o3-resumen-iva",
      },
      {
        id: "r-o4",
        title: "R-O4 · Archivo XML de retenciones de ISLR (mensual)",
        body: "Archivo mensual para declarar el ISLR retenido en el portal SENIAT. Agrega todas las retenciones de ISLR emitidas en el mes.",
        steps: [
          "Emite todos los comprobantes ISLR del mes (ver R-E6) antes del corte.",
          "Genera el XML del mes y valídalo contra el esquema oficial del portal.",
          "Compara el total del XML con el correlativo del mes: deben coincidir.",
          "Guarda el XML aceptado junto al paquete de cierre del período.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · enero 2026",
          lines: [
            "2 comprobantes ISLR del mes: retenido 20,00 + 35,00 = XML por 55,00",
          ],
        },
        pantalla: "Panel → Retenciones ISLR → Correlativo → XML mensual",
        estado: { label: "Requiere decisión Q14", ok: false, note: "Sin layout oficial del SENIAT + respuesta del cliente no se construye (ver 03-pendientes-cliente.md)." },
        flow: "r-o4-xml-islr",
      },
    ],
  },
  {
    id: "especial",
    rol: "Contribuyente Especial",
    badge: "Cierre quincenal",
    intro:
      "Empresas con período quincenal: todo se consolida por Q1 (día 01→16) y Q2 (día 16→fin de mes). Solo el XML de ISLR sigue siendo mensual.",
    fns: [
      {
        id: "r-e1",
        title: "R-E1 · Libro de Compras + totales (Q1 y Q2)",
        body: "Igual que R-O1, generado dos veces: Q1 del 01 al 16 y Q2 del 16 al primer día del mes siguiente. Cada quincena cierra por separado.",
        steps: [
          "Panel → Períodos: ubica la quincena (Q1 o Q2) y confirma que está abierta.",
          "Registra las compras con fecha fiscal dentro de la quincena (la fecha de registro no mueve el período).",
          "Panel → Reportes → Libro de Compras: elige la quincena y revisa líneas + totales.",
          "Descarga CSV de respaldo por quincena.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · Q1 enero 2026",
          lines: [
            "2 compras Q1: bases 5.000,00 + 3.000,00 = base 8.000,00 · IVA 1.280,00",
          ],
        },
        pantalla: "Panel → Compras → Reportes → Libro de Compras (Q1/Q2)",
        estado: { label: "Disponible", ok: true },
        flow: "r-e1-compras-quincenal",
      },
      {
        id: "r-e2",
        title: "R-E2 · Libro de Ventas + totales (Q1 y Q2)",
        body: "Igual que R-O2, por quincena: facturas o Z según sucursal, sin mezclar modos en la misma quincena y sucursal.",
        steps: [
          "Confirma el modo de ventas por sucursal (igual que en mensual).",
          "Registra ventas/Z con fecha fiscal dentro de la quincena.",
          "Panel → Reportes → Libro de Ventas: revisa líneas + totales de Q1 y de Q2.",
          "Descarga CSV de respaldo por quincena.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · Q2 enero 2026",
          lines: [
            "Z Nº 15 (máquina 01): rango V-100→V-160 · base 30.000,00 · IVA 4.800,00",
          ],
        },
        pantalla: "Panel → Ventas → Reportes → Libro de Ventas (Q1/Q2)",
        estado: { label: "Disponible", ok: true, note: "Igual que R-O2: fuente por sucursal pendiente (G7)." },
        flow: "r-e2-ventas-quincenal",
      },
      {
        id: "r-e3",
        title: "R-E3 · Resumen de IVA (Q1 y Q2)",
        body: "Igual que R-O3, por quincena. El excedente que quede en Q1 se arrastra a Q2 con trazabilidad.",
        steps: [
          "Cierra la carga de la quincena (compras + ventas + comprobantes).",
          "Panel → Reportes → Resumen IVA: elige Q1 o Q2 y revisa cuota de la quincena.",
          "Verifica el arrastre de excedente Q1 → Q2 con el contador.",
          "Concilia y congela la versión por quincena.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · Q1 enero 2026",
          lines: [
            "Débito 4.800,00 − crédito 1.280,00 = cuota Q1 3.520,00",
          ],
        },
        pantalla: "Panel → Reportes → Resumen IVA (Q1/Q2)",
        estado: { label: "Disponible", ok: true, note: "Regla de arrastre de excedente por firmar con el contador." },
        flow: "r-e3-resumen-quincenal",
      },
      {
        id: "r-e4",
        title: "R-E4 · Correlativo de comprobantes IVA + ISLR (quincenal)",
        body: "Listado ordenado de los comprobantes emitidos en la quincena, con estado (emitido/entregado/anulado). Los anulados aparecen marcados: el número nunca se reutiliza. El número IVA es mensual (AAAAMM + 8 dígitos); en quincenal la serie lleva la marca Q1/Q2 y la quincena la da el período.",
        steps: [
          "Panel → Retenciones IVA (o ISLR): revisa la bandeja del período.",
          "Descargar CSV: comprobante, emisión, RIF, razón social, retenido y estado.",
          "Filtra por quincena (periodId) y verifica que no falten números en la secuencia.",
          "Al congelar la quincena el paquete ya trae ambas secciones; guarda el CSV como respaldo.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · Q1 enero 2026",
          lines: [
            "20260100000001 · 05-01 · J-99999999-9 · 120,00 · emitida",
            "20260100000002 · 10-01 · J-99999999-9 · 60,00 · anulada (marcada, número consumido)",
            "ISLR-202601-Q1-000001 · 12-01 · V-99999999-9 · 20,00 · entregada (serie provisional hasta G9)",
          ],
        },
        pantalla: "Panel → Retenciones IVA / ISLR → Descargar CSV",
        estado: { label: "Disponible", ok: true, note: "Correlativo ISLR con serie provisional hasta G9." },
        flow: "r-e4-correlativo",
      },
      {
        id: "r-e5",
        title: "R-E5 · Comprobante de retención de IVA (por comprobante)",
        body: "Documento que prueba la retención practicada al proveedor, con numeración propia sin huecos. Puede agrupar varias facturas. Lo emitido no se edita: se entrega o se anula.",
        steps: [
          "Panel → Retenciones IVA → Nuevo: selecciona facturas elegibles del proveedor.",
          "Revisa el preview con la justificación línea por línea (base, IVA, % y retenido).",
          "Emite: el número se reserva en la misma transacción (si falla, no se consume).",
          "Registra la entrega al proveedor dentro del plazo (2 días hábiles del período siguiente).",
        ],
        ejemplo: {
          title: "Ejemplo ficticio",
          lines: [
            "F-0001 (IVA 160,00) al 75% → retenido 120,00 · comprobante 20260100000001",
          ],
        },
        pantalla: "Panel → Retenciones IVA → Nuevo → Emitir → Entregar",
        estado: { label: "Disponible", ok: true },
        flow: "r-e5-comprobante-iva",
      },
      {
        id: "r-e6",
        title: "R-E6 · Comprobante de retención de ISLR (por comprobante)",
        body: "Retención sobre pagos por concepto (honorarios, comisiones, alquileres…): base gravable × porcentaje − sustraendo. Nace del pago o abono en cuenta, lo que ocurra primero.",
        steps: [
          "Panel → Pagos: registra el evento (pago o abono) con fecha efectiva y asígnalo a sus documentos.",
          "Panel → Retenciones ISLR → Nuevo: elige evento, concepto y base; compara ambos escenarios pago/abono.",
          "Emite solo si converges (o con criterio G2 configurado por el contador).",
          "Anular un comprobante no libera el número; el sustituto cita al original.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio",
          lines: [
            "Honorarios base 1.000,00 × 2% − 0,00 = retenido 20,00",
          ],
        },
        pantalla: "Panel → Pagos → Retenciones ISLR → Nuevo → Emitir",
        estado: { label: "Parcial", ok: true, note: "Serie provisional ISLR-AAAAMM-###### hasta definir formato G9 + matriz de conceptos." },
        flow: "r-e6-comprobante-islr",
      },
      {
        id: "r-e7",
        title: "R-E7 · Archivo XML de ISLR (mensual, agrega Q1+Q2)",
        body: "Aunque la empresa cierre por quincena, este archivo es mensual: suma las retenciones de ISLR de Q1 y Q2 para el portal SENIAT.",
        steps: [
          "Cierra Q1 y Q2 con sus correlativos verificados.",
          "Genera el XML del mes (Q1 + Q2) y valídalo contra el esquema oficial.",
          "Compara el total con la suma de ambos correlativos.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · enero 2026",
          lines: [
            "Q1 20,00 + Q2 35,00 = XML mensual por 55,00",
          ],
        },
        pantalla: "Panel → Retenciones ISLR → Correlativo Q1/Q2 → XML mensual",
        estado: { label: "Requiere decisión Q14", ok: false, note: "Mismo gate que R-O4." },
        flow: "r-e7-xml-mensual",
      },
      {
        id: "r-e8",
        title: "R-E8 · Archivo TXT de IVA (quincenal)",
        body: "Archivo por quincena para declarar el IVA del especial en el portal SENIAT.",
        steps: [
          "Cierra la quincena (libros + resumen + comprobantes conciliados).",
          "Genera el TXT de la quincena y valídalo contra el layout oficial.",
          "Guárdalo junto al paquete de cierre de la quincena.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · Q1 enero 2026",
          lines: [
            "TXT Q1 con débitos 4.800,00 y créditos 1.280,00",
          ],
        },
        pantalla: "Panel → Resumen IVA (Q1/Q2) → TXT quincenal",
        estado: { label: "Requiere decisión Q14", ok: false, note: "Mismo gate que R-O4: layout + ejemplo aceptado." },
        flow: "r-e8-txt-iva",
      },
    ],
  },
  {
    id: "contador",
    rol: "Contador · Validación fiscal",
    badge: "Firma lo fiscal",
    intro:
      "Tus intervenciones para que el sistema produzca con validez: revisas el estado, firmas decisiones y matriz, activas reglas y validas el mes piloto. Sin tu firma no se activa nada fiscal.",
    fns: [
      {
        id: "cnt-estado",
        title: "V-1 · Revisar el estado fiscal",
        body: "Abres el estado fiscal de la empresa y ves qué está firmado en el sistema y qué falta en el expediente, cada gate con su fuente.",
        steps: [
          "Panel → Estado fiscal: lee Firmado / Parcial / Pendiente por gate.",
          "Lo marcado 'expediente externo' (matriz, muestras, Q14) se resuelve fuera del sistema con las hojas de firma.",
          "Prioriza por bloqueo: G9 y matriz ISLR liberan R-E6; Q14 libera R-O4/R-E7/R-E8.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio",
          lines: [
            "RDF: 0/7 firmadas · Reglas activas: 0 · Dorados: 0/17",
            "Siguiente firma sugerida: G9 (hoja lista)",
          ],
        },
        pantalla: "Panel → Estado fiscal",
        estado: { label: "Disponible", ok: true },
        flow: "v-1-estado-fiscal",
      },
      {
        id: "cnt-g9",
        title: "V-2 · Firmar la decisión G9 (serie ISLR)",
        body: "Decides el formato de numeración ISLR. Con la opción A adoptas la serie provisional actual como definitiva y no hay migración.",
        steps: [
          "Lee la hoja de firma G9 (docs/anexos/hoja-firma-G9-ISLR.md §G9).",
          "Marca A (serie actual permanente) o B (otro formato con ejemplo anexado).",
          "Registra la decisión en Panel → Decisiones → Nueva y fírmala con nombre y documento.",
          "Con G9 firmada, el correlativo y los comprobantes ISLR citan formato con respaldo.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio",
          lines: [
            "Opción A firmada: ISLR-AAAAMM-###### permanente",
            "RDF-2026-0003 firmada 2026-10-15 · sha256 abc123…",
          ],
        },
        pantalla: "Panel → Decisiones → Nueva → Firmar",
        estado: { label: "Disponible", ok: true, note: "El mecanismo existe; falta tu firma." },
        flow: "v-2-firma-g9",
      },
      {
        id: "cnt-matriz",
        title: "V-3 · Firmar la matriz ISLR por concepto",
        body: "Validás por concepto pagado: porcentaje, base con o sin IVA, sustraendo en parciales, UT, mínimos y sujetos. Lo propuesto se coteja contra Gaceta.",
        steps: [
          "Completa la tabla de la hoja (un renglón por concepto: HON, comisiones, alquileres…).",
          "Marca por fila APROBADO o MODIFICAR con el valor correcto.",
          "Firma con nombre, documento y fecha; cada fila aprobada genera su RDF.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio",
          lines: [
            "HON: 2% sin sustraendo, base sin IVA, sustraendo en cada pago — APROBADO",
          ],
        },
        pantalla: "Hoja de firma → Panel → Decisiones",
        estado: { label: "Disponible", ok: true, note: "Sin firma no se parametriza nada (regla de hierro)." },
        flow: "v-3-matriz-islr",
      },
      {
        id: "cnt-rdf",
        title: "V-4 · Firmar decisiones (flujo RDF)",
        body: "Toda decisión fiscal sigue borrador → revisión → aprobación → firma. Al firmar se congela la huella sha256: lo firmado no se edita.",
        steps: [
          "Panel → Decisiones: abre el borrador preparado (el administrativo puede prepararlo).",
          "Revisa hecho, alternativas A/B con impacto numérico y cobertura prevista.",
          "Aprueba y firma; si hay que corregir, se crea una nueva que cita a la anterior.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio",
          lines: [
            "RDF-2026-0004: criterio G2 payment_only + motivo auditado",
          ],
        },
        pantalla: "Panel → Decisiones → ficha → Firmar",
        estado: { label: "Disponible", ok: true },
        flow: "v-4-flujo-rdf",
      },
      {
        id: "cnt-reglas",
        title: "V-5 · Activar reglas con cobertura",
        body: "Activas reglas versionadas por vigencia. La activación exige decisión firmada vinculada con cobertura del mismo impuesto y concepto.",
        steps: [
          "Panel → Reglas: crea el borrador con porcentaje, sustraendo, base y fuente normativa.",
          "Vincula la decisión firmada que lo autoriza (autoriza/aclara).",
          "Activa: sin cobertura el sistema lo rechaza con GATE_NO_RDF.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio",
          lines: [
            "Regla ISLR-HON 2% [2026-01-01,∞) vinculada a RDF-2026-0004 → activa",
          ],
        },
        pantalla: "Panel → Reglas → Vincular → Activar",
        estado: { label: "Disponible", ok: true },
        flow: "v-5-activar-reglas",
      },
      {
        id: "cnt-piloto",
        title: "V-6 · Validar el mes piloto",
        body: "Confrontas el mes del sistema contra tus libros (M-3): diferencia 0 o justificada por escrito. Es el gate M5 antes del go-live.",
        steps: [
          "Entrega M-1 (CSV), M-2 (Z), M-3 (tus libros del mismo mes) y M-4 (XLSX plantilla).",
          "Revisa paquete del período: libros, resumen, comprobantes, correlativo y conciliación.",
          "Firma el acta de aceptación o devuelve con observaciones; los dorados firmados cuentan 1 a 1.",
        ],
        ejemplo: {
          title: "Ejemplo ficticio · enero 2026",
          lines: [
            "Libro sistema base 10.000,00 = libro contador base 10.000,00 → 0 diferencia",
          ],
        },
        pantalla: "Panel → Períodos → Paquete → Acta",
        estado: { label: "Disponible", ok: true, note: "Pendiente de recibir M-1…M-4." },
        flow: "v-6-mes-piloto",
      },
    ],
  },
];

export const FLOWS: { title: string; steps: string[]; note: string; flow?: FlowProcess }[] = [
  {
    title: "Cierre mensual (ordinario)",
    steps: ["Cargar", "Libros", "Resumen", "Conciliar", "Congelar paquete"],
    note: "Cuatro reportes + paquete: del documento al hash reproducible.",
    flow: "cierre-mensual",
  },
  {
    title: "Cierre quincenal (especial)",
    steps: ["Cargar Q1/Q2", "Libros", "Comprobantes", "Correlativo", "Resumen", "TXT"],
    note: "Ocho reportes; el XML de ISLR agrega Q1 + Q2 al final del mes.",
    flow: "cierre-quincenal",
  },
];
