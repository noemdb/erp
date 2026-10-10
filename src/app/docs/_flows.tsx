"use client";

import { useState, type ReactNode } from "react";
import AccountTree from "@mui/icons-material/AccountTree";
import Close from "@mui/icons-material/Close";
import Info from "@mui/icons-material/Info";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type Flow = {
  id: string;
  process: string;
  subtitle: string;
  footer: ReactNode;
};

export type FlowProcess =
  | "compras"
  | "ventas"
  | "pagos"
  | "iva"
  | "islr"
  | "recibidas"
  | "terceros"
  | "importaciones"
  | "reglas"
  | "decisiones"
  | "configuracion"
  | "plazos"
  | "periodos"
  | "libro-compras"
  | "libro-ventas"
  | "resumen-iva"
  | "bitacora"
  | "r-o1-libro-compras"
  | "r-o2-libro-ventas"
  | "r-o3-resumen-iva"
  | "r-o4-xml-islr"
  | "r-e1-compras-quincenal"
  | "r-e2-ventas-quincenal"
  | "r-e3-resumen-quincenal"
  | "r-e4-correlativo"
  | "r-e5-comprobante-iva"
  | "r-e6-comprobante-islr"
  | "r-e7-xml-mensual"
  | "r-e8-txt-iva"
  | "cierre-mensual"
  | "cierre-quincenal"
  | "v-1-estado-fiscal"
  | "v-2-firma-g9"
  | "v-3-matriz-islr"
  | "v-4-flujo-rdf"
  | "v-5-activar-reglas"
  | "v-6-mes-piloto";

const FLOWS: Record<FlowProcess, Flow> = {
  compras: {
    id: "compras",
    process: "Compras",
    subtitle: "Del documento del proveedor al Libro de Compras",
    footer: (
      <>
        Si el mes ya está cerrado no se puede editar: pídele al contador la
        reapertura. Si un número no cuadra o el documento ya existe, el sistema
        te avisa y nada se guarda a medias.
      </>
    ),
  },
  ventas: {
    id: "ventas",
    process: "Ventas",
    subtitle: "De tus ventas al Libro de Ventas",
    footer: (
      <>
        Si un cliente te retiene, anota su comprobante en Retenciones
        recibidas para que aparezca a tu favor en el resumen.
      </>
    ),
  },
  pagos: {
    id: "pagos",
    process: "Pagos",
    subtitle: "De tu pago al comprobante",
    footer: (
      <>
        Anotar el pago no genera la retención sola: se emite aparte tomando tu
        pago o abono como base.
      </>
    ),
  },
  iva: {
    id: "iva",
    process: "Retenciones IVA",
    subtitle: "De tus facturas al comprobante",
    footer: (
      <>
        Un comprobante puede cubrir varias facturas del mismo proveedor.
        Emitido no se edita: se anula con motivo y se emite el sustituto.
      </>
    ),
  },
  islr: {
    id: "islr",
    process: "Retenciones ISLR",
    subtitle: "De tu pago al comprobante por concepto",
    footer: (
      <>
        El concepto (honorarios, alquileres…) define cuánto se retiene.
        Nace de tu pago o abono, lo que ocurra primero.
      </>
    ),
  },
  recibidas: {
    id: "recibidas",
    process: "Retenciones recibidas",
    subtitle: "Lo que te retuvieron, a tu favor",
    footer: (
      <>
        Anota lo que te retuvieron tus clientes y vincúlalo a tus ventas:
        aparece a tu favor en el resumen.
      </>
    ),
  },
  terceros: {
    id: "terceros",
    process: "Terceros",
    subtitle: "Tus clientes y proveedores en orden",
    footer: (
      <>
        Un mismo tercero te sirve para comprar y vender. Si está inactivo,
        no acepta documentos nuevos pero conserva su historia.
      </>
    ),
  },
  importaciones: {
    id: "importaciones",
    process: "Importaciones",
    subtitle: "Sube tu archivo sin miedo",
    footer: (
      <>
        Revisa las filas rechazadas, corrígelas y confirma solo las válidas.
        Subir dos veces el mismo archivo no duplica nada.
      </>
    ),
  },
  reglas: {
    id: "reglas",
    process: "Reglas",
    subtitle: "Tus reglas claras (solo contador)",
    footer: (
      <>
        Activar una regla nueva cierra la anterior sin borrar la historia.
        Cada cálculo anota con qué regla se hizo.
      </>
    ),
  },
  decisiones: {
    id: "decisiones",
    process: "Decisiones",
    subtitle: "Tus decisiones firmadas (contador firma)",
    footer: (
      <>
        Sin decisión firmada no se activa ninguna regla. Lo firmado no se
        edita: se sustituye con una decisión nueva.
      </>
    ),
  },
  configuracion: {
    id: "configuracion",
    process: "Configuración",
    subtitle: "Tu empresa a punto",
    footer: (
      <>
        El tipo de período no se cambia con meses cerrados. Todo cambio de
        perfil queda anotado con antes y después.
      </>
    ),
  },
  plazos: {
    id: "plazos",
    process: "Plazos",
    subtitle: "Tus fechas sin sustos",
    footer: (
      <>
        Atiende los avisos a tiempo y anota cada entrega con su fecha:
        así cierras el ciclo sin sanciones.
      </>
    ),
  },
  periodos: {
    id: "periodos",
    process: "Períodos",
    subtitle: "Tu mes bajo control",
    footer: (
      <>
        Cerrado no se toca: solo se reabre con motivo y responsable.
        Todo queda anotado en la bitácora.
      </>
    ),
  },
  "libro-compras": {
    id: "libro-compras",
    process: "Libro de Compras",
    subtitle: "Tu Libro de Compras solo",
    footer: (
      <>
        El libro se arma solo con tus compras: nunca se escribe a mano.
        Cada total te lleva a sus documentos.
      </>
    ),
  },
  "libro-ventas": {
    id: "libro-ventas",
    process: "Libro de Ventas",
    subtitle: "Tu Libro de Ventas solo",
    footer: (
      <>
        Factura o reporte Z según tu local, sin mezclar en el mismo mes.
        Descárgalo congelado como respaldo.
      </>
    ),
  },
  "resumen-iva": {
    id: "resumen-iva",
    process: "Resumen IVA",
    subtitle: "Tu resumen cuadra solo",
    footer: (
      <>
        Es tu insumo para declarar, no la declaración. Se congela antes de
        cerrar el mes.
      </>
    ),
  },
  bitacora: {
    id: "bitacora",
    process: "Bitácora",
    subtitle: "Todo queda anotado",
    footer: (
      <>
        Del total al documento en pocos clics. Nadie puede borrar ni
        editar lo anotado.
      </>
    ),
  },
  "r-o1-libro-compras": {
    id: "r-o1-libro-compras",
    process: "R-O1 · Libro de Compras",
    subtitle: "Cierras enero paso a paso",
    footer: (
      <>
        Mes abierto para cargar, mes cerrado para congelar. La NC siempre
        cita su documento afectado; el paquete congelado reproduce el mismo hash.
      </>
    ),
  },
  "r-o2-libro-ventas": {
    id: "r-o2-libro-ventas",
    process: "R-O2 · Libro de Ventas",
    subtitle: "Por factura o por Z, cierras enero",
    footer: (
      <>
        Una sola forma por sucursal y mes: factura una a una o Z con rango.
        Los saltos se avisan; el paquete congelado reproduce el mismo hash.
      </>
    ),
  },
  "r-o3-resumen-iva": {
    id: "r-o3-resumen-iva",
    process: "R-O3 · Resumen de IVA",
    subtitle: "Revisas, concilias y congelas enero",
    footer: (
      <>
        Insumo para declarar, no la declaración. Recibidas sin neteo;
        la versión congelada reproduce el mismo hash.
      </>
    ),
  },
  "r-o4-xml-islr": {
    id: "r-o4-xml-islr",
    process: "R-O4 · XML de ISLR",
    subtitle: "Diseñado, pendiente Q14",
    footer: (
      <>
        Proceso diseñado, no construido: requiere Q14 afirmativo más layout
        oficial del SENIAT. Sin spec no se escribe ni una línea.
      </>
    ),
  },
  "r-e1-compras-quincenal": {
    id: "r-e1-compras-quincenal",
    process: "R-E1 · Compras quincenal",
    subtitle: "Q1 y Q2, cada una con su libro",
    footer: (
      <>
        La fecha fiscal decide la quincena, no la fecha de registro.
        Cada quincena congela su propio paquete reproducible.
      </>
    ),
  },
  "r-e2-ventas-quincenal": {
    id: "r-e2-ventas-quincenal",
    process: "R-E2 · Ventas quincenal",
    subtitle: "Q1 y Q2, factura o Z por sucursal",
    footer: (
      <>
        Una sola forma por sucursal y quincena. Los saltos del Z se avisan;
        cada quincena congela su propio paquete reproducible.
      </>
    ),
  },
  "r-e3-resumen-quincenal": {
    id: "r-e3-resumen-quincenal",
    process: "R-E3 · Resumen quincenal",
    subtitle: "Q1 y Q2 con arrastre de excedente",
    footer: (
      <>
        El excedente de Q1 viaja a Q2 con trazabilidad. Cada quincena
        concilia y congela su propia versión reproducible.
      </>
    ),
  },
  "r-e4-correlativo": {
    id: "r-e4-correlativo",
    process: "R-E4 · Correlativo quincenal",
    subtitle: "IVA e ISLR, sin huecos",
    footer: (
      <>
        Anulados marcados sin liberar número. ISLR con serie provisional
        hasta G9; el paquete ya trae ambas secciones y el CSV queda como respaldo.
      </>
    ),
  },
  "r-e5-comprobante-iva": {
    id: "r-e5-comprobante-iva",
    process: "R-E5 · Comprobante IVA",
    subtitle: "Elegibles, preview, emisión y entrega",
    footer: (
      <>
        El número nace y muere en la transacción: fallo no consume, anulado
        no se reutiliza. Entrega con fecha dentro del plazo.
      </>
    ),
  },
  "r-e6-comprobante-islr": {
    id: "r-e6-comprobante-islr",
    process: "R-E6 · Comprobante ISLR",
    subtitle: "Evento, preview dual, emisión y entrega",
    footer: (
      <>
        Nace del pago o abono, lo que ocurra primero; solo se emite si ambos
        escenarios convergen. Serie provisional hasta G9.
      </>
    ),
  },
  "r-e7-xml-mensual": {
    id: "r-e7-xml-mensual",
    process: "R-E7 · XML mensual Q1+Q2",
    subtitle: "Diseñado, pendiente Q14",
    footer: (
      <>
        Aunque la empresa cierre por quincena, este archivo es mensual.
        Requiere Q14 afirmativo más layout oficial del SENIAT.
      </>
    ),
  },
  "r-e8-txt-iva": {
    id: "r-e8-txt-iva",
    process: "R-E8 · TXT quincenal",
    subtitle: "Diseñado, pendiente Q14",
    footer: (
      <>
        Un archivo por quincena para el especial. Requiere Q14 afirmativo
        más layout oficial del SENIAT.
      </>
    ),
  },
  "cierre-mensual": {
    id: "cierre-mensual",
    process: "Cierre mensual",
    subtitle: "Ordinario: 4 reportes más paquete",
    footer: (
      <>
        Cerrado no se toca: solo reapertura con motivo y responsable.
        Regenerar da el mismo hash.
      </>
    ),
  },
  "cierre-quincenal": {
    id: "cierre-quincenal",
    process: "Cierre quincenal",
    subtitle: "Especial: 8 reportes, XML mensual",
    footer: (
      <>
        Q1 y Q2 cierran por separado; el XML mensual las suma.
        TXT/XML requieren Q14 más layout oficial.
      </>
    ),
  },
  "v-1-estado-fiscal": {
    id: "v-1-estado-fiscal",
    process: "V-1 · Estado fiscal",
    subtitle: "Firmado en sistema, pendiente en expediente",
    footer: (
      <>
        Lo no firmado no activa reglas ni valida comprobantes.
        Prioriza por bloqueo: G9 y matriz liberan R-E6.
      </>
    ),
  },
  "v-2-firma-g9": {
    id: "v-2-firma-g9",
    process: "V-2 · Firma G9",
    subtitle: "Serie ISLR: A sin migrar o B con ejemplo",
    footer: (
      <>
        Con A no hay migración; con B se planifica convivencia antes de
        emitir. Firmado, R-E6 deja de ser provisional.
      </>
    ),
  },
  "v-3-matriz-islr": {
    id: "v-3-matriz-islr",
    process: "V-3 · Matriz ISLR",
    subtitle: "Por concepto, con cotejo y firma",
    footer: (
      <>
        Lo propuesto se coteja contra Gaceta: no es valor final hasta tu
        firma. Cada fila aprobada genera su RDF y activa su regla.
      </>
    ),
  },
  "v-4-flujo-rdf": {
    id: "v-4-flujo-rdf",
    process: "V-4 · Flujo RDF",
    subtitle: "Borrador, firma y sustitución",
    footer: (
      <>
        Solo el contador aprueba y firma. Lo firmado no se edita:
        se sustituye con una nueva que cita a la anterior.
      </>
    ),
  },
  "v-5-activar-reglas": {
    id: "v-5-activar-reglas",
    process: "V-5 · Activar reglas",
    subtitle: "Sin cobertura rechaza, con cobertura activa",
    footer: (
      <>
        El gate es fail-closed: nada se activa a medias. Activar cierra
        la vigencia anterior sin borrar historia.
      </>
    ),
  },
  "v-6-mes-piloto": {
    id: "v-6-mes-piloto",
    process: "V-6 · Mes piloto",
    subtitle: "Muestras, cotejo a 0 y acta",
    footer: (
      <>
        Mismo mes en M-1…M-4 o no hay aceptación. Diferencia 0 o
        justificada por escrito; dorados firmados 1 a 1.
      </>
    ),
  },
};

export function FlowButton({ process }: { process: FlowProcess }) {
  const [open, setOpen] = useState(false);
  const flow = FLOWS[process];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-periwinkle-200 px-3.5 py-1.5 my-1",
          "text-xs font-medium text-periwinkle-500 transition-colors",
          "hover:border-[#37c8a1] hover:text-[#120c27]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
        )}
      >
        <AccountTree className="h-3.5 w-3.5" aria-hidden />
        Ver flujo
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        label={`Diagrama de flujo: ${flow.process}`}
        dialogClassName="animate-fade-up relative h-[90vh] w-[90vw] overflow-y-auto rounded-md border border-periwinkle-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-periwinkle-400">
              <AccountTree className="h-4 w-4" aria-hidden /> Diagrama de flujo
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#120c27]">{flow.process}</h2>
            <p className="mt-0.5 text-sm text-periwinkle-500">{flow.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar diagrama"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-periwinkle-400 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
          >
            <Close className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <iframe
          src={`/docs/flujos/${flow.id}.html`}
          title={`Diagrama interactivo: ${flow.process}`}
          className="mt-4 h-[68vh] w-full rounded-md border border-periwinkle-200 bg-white"
          loading="lazy"
          allowFullScreen
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-periwinkle-500">
            Diagrama interactivo: elige un flujo y avanza paso a paso con los
            controles del lienzo.{" "}
            <a
              href={`/docs/flujos/${flow.id}.html`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#352574] hover:underline"
            >
              Abrir en pestaña nueva →
            </a>
          </p>
        </div>
        <div className="mt-3 flex gap-2 rounded-md border border-periwinkle-200 bg-periwinkle-100/50 px-4 py-3 text-sm text-periwinkle-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#352574]" aria-hidden />
          <p>{flow.footer}</p>
        </div>
      </Modal>
    </>
  );
}
