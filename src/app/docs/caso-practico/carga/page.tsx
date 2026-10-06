import { Badge } from "@/components/ui/badge";
import { DocsShell, getDocsSession, DocCallout } from "../../_components";
import { Paso, PasoNav } from "../_steps";

export default async function CasoCarga() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocsShell
      user={user}
      companyCount={companyCount}
      current="/docs/caso-practico/carga"
      breadcrumb={
        <>
          <span aria-hidden>/</span>
          <span className="text-periwinkle-900">Caso práctico · La carga del mes</span>
        </>
      }
    >
      <Badge variant="outline">5 · Caso práctico</Badge>
      <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        La carga del mes
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
        María recibe el archivo con las compras de septiembre y lo sube al sistema.
        El sistema revisa cada línea, avisa lo que ve raro y deja constancia de todo.
        A la izquierda de cada paso, lo que hay que hacer; a la derecha, lo que pasó
        en la simulación real.
      </p>

      <div className="mt-6 space-y-6">
        <Paso
          n="1"
          titulo="Subir el archivo y validar"
          ruta="Panel → Importaciones → Nueva importación"
          guia={
            <p>
              Indica que son compras y que vienen del sistema anterior, adjunta el
              archivo y pulsa subir. Luego abre el lote y pulsa validar: el sistema
              revisa RIF, fechas, que base más IVA cuadre con el total y que no haya
              duplicados.
            </p>
          }
          practica={
            <>
              <p>
                El lote quedó <strong>Validado</strong> con este marcador:
                <strong> Total 10 · Válidas 0 · Advertencias 9 · Rechazadas 1</strong>.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>9 advertencias porque los 6 proveedores eran nuevos (más un aviso de pago parcial que verás en el paso 4).</li>
                <li>1 rechazada: la nota de crédito, porque ese tipo de documento siempre necesita indicar a cuál factura afecta y el archivo no lo dice.</li>
                <li>Dos líneas con centavos “raros” (160,05 y 320,10) pasaron sin aviso: cuadraban con su total, y eso es lo único que el sistema verifica en esta etapa.</li>
              </ul>
            </>
          }
        />

        <Paso
          n="2"
          titulo="Descargar las rechazadas y confirmar"
          ruta="Panel → Importaciones → detalle del lote"
          guia={
            <p>
              Descarga el archivo de rechazadas y guárdalo como evidencia. Después
              confirma el lote: solo las filas válidas y con advertencia se convierten
              en documentos. La rechazada queda fuera, pendiente de registro manual.
            </p>
          }
          practica={
            <p>
              El sistema respondió <strong>Creados 9, omitidos 0, rechazados 1</strong> y
              el lote pasó a <strong>Parcial</strong>: 9 filas importadas y la nota de
              crédito excluida. Cada documento nuevo guarda de qué archivo y de qué
              fila nació.
            </p>
          }
        />

        <Paso
          n="3"
          titulo="Registrar la nota de crédito a mano"
          ruta="Panel → Compras → Nueva compra"
          guia={
            <p>
              Crea una nota de crédito con los datos de la fila rechazada (número,
              control, fechas, base 100,00 e IVA 16,00) e indica a cuál factura
              afecta (la 001-00001). El sistema solo la guarda si base más IVA cuadra
              con el total.
            </p>
          }
          practica={
            <p>
              La nota <strong>001-00004</strong> quedó registrada a la primera, con
              fecha fiscal 10-09-2025 y su factura afectada enlazada. Compras muestra
              ahora <strong>10 documentos: base 10.000,00 · IVA 1.588,15</strong>.
              En la primera corrida este mismo paso se había hecho mal (otro tipo de
              documento y otro año) y hubo que anularlo: aquí salió bien porque la
              guía ya advertía qué verificar.
            </p>
          }
          hallazgo="La alícuota se ve en dos escalas según el origen: 0.16 en las importadas y 16 en las manuales. Es solo presentación y no cambia ningún cálculo, pero quedó anotado para unificarlo."
        />
      </div>

      <div className="mt-6 space-y-3">
        <DocCallout title="Columnas que el sistema no usa (y lo dice)">
          Dos columnas del archivo (`alicuota_iva` y `fecha_recepcion`) aparecen en un
          aviso visible como “informativas no consumidas”: la alícuota se deduce al
          confirmar y la fecha fiscal sale siempre de la fecha del documento. Nada se
          ignora en silencio.
        </DocCallout>
      </div>

      <PasoNav
        prev={{ href: "/docs/caso-practico/resumen", label: "La historia" }}
        next={{ href: "/docs/caso-practico/comprobacion", label: "Pagos y comprobantes" }}
      />
    </DocsShell>
  );
}
