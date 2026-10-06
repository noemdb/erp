import { Badge } from "@/components/ui/badge";
import { DocsShell, getDocsSession, DocCallout } from "../../_components";
import { Paso, Cifras, PasoNav } from "../_steps";

export default async function CasoComprobacion() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocsShell
      user={user}
      companyCount={companyCount}
      current="/docs/caso-practico/comprobacion"
      breadcrumb={
        <>
          <span aria-hidden>/</span>
          <span className="text-periwinkle-900">Caso práctico · Pagos y comprobantes</span>
        </>
      }
    >
      <Badge variant="outline">5 · Caso práctico</Badge>
      <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        Pagos y comprobantes
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
        Con la data limpia, el contador registra el pago parcial, activa a la empresa
        como agente de retención y revisa los cálculos antes de emitir. Todo lo de esta
        página se previsualizó sin emitir ningún comprobante.
      </p>

      <div className="mt-6 space-y-6">
        <Paso
          n="4"
          titulo="Registrar el pago y asignarlo a su factura"
          ruta="Panel → Pagos → Registrar evento"
          guia={
            <p>
              Registra el pago de 1.500,00 al proveedor de servicios con su fecha real
              y una referencia que explique de dónde sale el dato. Después asígnalo a
              su factura (la 004-00099): registrar o asignar no genera ninguna
              retención por sí solo, solo deja el pago listo para cuando toque retener.
            </p>
          }
          practica={
            <p>
              Pago del <strong>06-09-2025 × 1.500,00</strong> asignado a la factura
              <strong> 004-00099</strong> (total 3.480,00): quedó
              <strong> Asignado 1.500,00 / Disponible 0,00</strong>, con la línea de
              asignación visible en el detalle del evento. La factura queda con
              1.980,00 pendientes.
            </p>
          }
        />

        <Paso
          n="5"
          titulo="Activar a la empresa y a los proveedores"
          ruta="Panel → Configuración y Panel → Terceros"
          guia={
            <p>
              Primero, en la configuración de la empresa, marca que es agente de
              retención de IVA (sin eso, no hay nada que retener). Después, en cada
              proveedor, indica que sí es sujeto de retención de IVA, con vigencia que
              cubra septiembre. Este orden importa: si falta alguno de los dos, el
              cálculo avisa exactamente qué falta.
            </p>
          }
          practica={
            <p>
              Empresa activada como agente y los <strong>6 proveedores</strong> marcados
              como sujetos con vigencia desde el 01-01-2025. En la primera corrida
              estos dos pasos faltaban y el sistema respondió con dos avisos distintos
              (“no es agente”, “no es sujeto”); esta vez el cálculo pasó a la primera.
            </p>
          }
        />

        <Paso
          n="6"
          titulo="Previsualizar la retención de IVA"
          ruta="Panel → Retenciones IVA → Nuevo comprobante"
          guia={
            <p>
              Elige las 9 facturas (nunca la nota de crédito), pon fecha de emisión
              dentro de septiembre y pulsa previsualizar. El sistema muestra el total
              a retener con la cuenta de cada factura. Revisa y detente ahí: emitir es
              una decisión del contador con reglas firmadas.
            </p>
          }
          practica={
            <>
              <p>
                Cálculo con la <strong>regla del 75%</strong> sobre las 9 facturas
                (IVA total <strong>1.572,15</strong>), explicado línea por línea.
                Total a retener: <strong>1.179,12</strong>. La nota de crédito se
                excluyó a mano: aparece en la lista por un hueco conocido y nunca
                debe retenerse.
              </p>
              <div className="mt-3">
                <Cifras
                  caption="Todas las cuentas del comprobante (IVA × 75%)"
                  head={["Factura", "IVA", "Retenido"]}
                  rows={[
                    ["001-00001", "160,00", "120,00"],
                    ["001-00002", "160,05", "120,04"],
                    ["003-00010", "320,10", "240,08"],
                    ["005-00120", "12,00", "9,00"],
                    ["001-00003", "40,00", "30,00"],
                    ["002-00046", "192,00", "144,00"],
                    ["002-00045", "80,00", "60,00"],
                    ["004-00099", "480,00", "360,00"],
                    ["006-00005", "128,00", "96,00"],
                  ]}
                  foot={["Total", "1.572,15", "1.179,12"]}
                />
              </div>
            </>
          }
          hallazgo="Si multiplicas el total (1.572,15 × 75%) obtienes 1.179,11, un centavo menos. El sistema redondea cada línea y después suma (1.179,12): la diferencia depende de en qué momento se redondea, y eso lo debe definir el contador. Por eso el total se muestra con su explicación."
        />

        <Paso
          n="7"
          titulo="Comparar la retención del otro impuesto"
          ruta="Panel → Retenciones ISLR → Nuevo comprobante"
          guia={
            <p>
              Elige el pago asignado, el concepto del servicio, la base y una fecha de
              septiembre, y pulsa comparar. El sistema calcula bajo dos criterios
              (solo pagos, o pagos y abonos) y solo permite emitir si ambos coinciden.
            </p>
          }
          practica={
            <p>
              Los 6 conceptos se probaron uno por uno (<strong>HON, COM, ALQ, PUB, TRA,
              SER</strong>) y en los 6 el resultado fue el mismo: <strong>sin regla
              vigente para ese concepto y esa fecha</strong>, bloqueo antes de reservar
              número. El evento y su asignación estaban bien; lo que falta son las
              reglas del contador (porcentajes y vigencias por concepto). El sistema
              se negó a inventarlas, y esa negativa quedó registrada como evidencia.
            </p>
          }
        />
      </div>

      <div className="mt-6 space-y-3">
        <DocCallout title="Nada se emitió en esta historia">
          La bandeja de comprobantes quedó en cero a propósito: previsualizar no guarda
          nada. Emitir y cerrar el mes requieren las definiciones pendientes del
          contador, y llegarán en la sesión de reglas.
        </DocCallout>
      </div>

      <PasoNav
        prev={{ href: "/docs/caso-practico/carga", label: "La carga del mes" }}
        next={{ href: "/docs/caso-practico/cierre", label: "Cierre y consistencia" }}
      />
    </DocsShell>
  );
}
