import { Badge } from "@/components/ui/badge";
import { DocsShell, getDocsSession, DocCallout } from "../../_components";
import { Paso, Cifras, PasoNav } from "../_steps";

const CHECKS = [
  "Archivo subido sin errores de formato.",
  "El sistema detectó solo el rechazo de la nota de crédito.",
  "La nota se registró a mano sin rehacer el archivo.",
  "Cada cambio quedó en la bitácora con quién y cuándo.",
  "Tras confirmar, nada se pudo editar por debajo.",
  "El contador recibió la data limpia con el pago asignado.",
];

export default async function CasoCierre() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocsShell
      user={user}
      companyCount={companyCount}
      current="/docs/caso-practico/cierre"
      breadcrumb={
        <>
          <span aria-hidden>/</span>
          <span className="text-periwinkle-900">Caso práctico · Cierre y consistencia</span>
        </>
      }
    >
      <Badge variant="outline">5 · Caso práctico</Badge>
      <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        Cierre y consistencia
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
        El auditor recorre la bitácora, comprueba que cada cifra ate con su origen y
        archiva las pruebas. Al final, todas las piezas cuadran entre sí.
      </p>

      <div className="mt-6 space-y-6">
        <Paso
          n="8"
          titulo="Recorrer la bitácora y archivar"
          ruta="Panel → Bitácora (filtros por tipo y documento)"
          guia={
            <p>
              Filtra por lote para ver la subida y la confirmación; filtra por compras
              para ver cada documento creado; abre la línea de tiempo de un documento
              para ver su origen (lote y fila, o registro manual). Exporta cada vista
              como archivo para el expediente.
            </p>
          }
          practica={
            <>
              <p>Filtro de compras: <strong>10 eventos de creación</strong> (9 de la
              importación + 1 de la nota manual). Filtro del lote: subida +
              confirmación con 9 creados.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Línea de tiempo de la <strong>001-00001</strong>: origen lote, fila 1. Responde “¿de dónde salió?” en un clic.</li>
                <li>Línea de tiempo de la <strong>001-00004</strong>: registro manual, una sola creación. Sin lote, pero con autor y hora.</li>
                <li>Dos archivos exportados y archivados: el del lote y el de compras.</li>
              </ul>
            </>
          }
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold tracking-tight">
        Todo cuadra: la prueba de consistencia
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-periwinkle-600">
        Cada total de la historia se puede seguir hasta su origen. Léela de arriba
        hacia abajo: el archivo, los documentos, el cálculo y el pago.
      </p>
      <div className="mt-4 space-y-4">
        <Cifras
          caption="Del archivo a los documentos"
          head={["Origen", "Base", "IVA"]}
          rows={[
            ["9 facturas importadas", "9.900,00", "1.572,15"],
            ["Nota de crédito manual", "100,00", "16,00"],
          ]}
          foot={["En Compras (10 docs.)", "10.000,00", "1.588,15"]}
        />
        <Cifras
          caption="Del cálculo a la prueba"
          head={["Cuenta", "Cifra"]}
          rows={[
            ["IVA de las 9 facturas", "1.572,15"],
            ["Retención al 75% (por línea)", "1.179,12"],
            ["Pago registrado y asignado", "1.500,00"],
            ["Comprobantes emitidos", "0"],
          ]}
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold tracking-tight">
        Lista de cierre de la auxiliar
      </h2>
      <ul className="mt-3 space-y-2">
        {CHECKS.map((c, i) => (
          <li
            key={c}
            className="flex items-start gap-3 rounded-md border border-periwinkle-200 px-4 py-3 text-sm"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#37c8a1]/15 text-xs font-bold text-[#0d7a5f]"
              aria-hidden
            >
              ✓
            </span>
            <span>
              <strong>{i + 1}.</strong> {c}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-3">
        <DocCallout title="Qué sigue después de esta historia">
          La sesión de reglas con el contador: porcentajes del otro impuesto por
          concepto, cómo restan las notas de crédito en los totales y en qué momento
          se redondea. Con esas tres definiciones firmadas, los comprobantes se pueden
          emitir y el mes se puede cerrar. Esta simulación dejó todo lo demás listo.
        </DocCallout>
      </div>

      <PasoNav
        prev={{ href: "/docs/caso-practico/comprobacion", label: "Pagos y comprobantes" }}
      />
    </DocsShell>
  );
}
