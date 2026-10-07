import { Badge } from "@/components/ui/badge";
import { DocsShell, getDocsSession, DocCallout } from "../../_components";
import { Cifras, PasoNav } from "../_steps";

export default async function CasoResumen() {
  const { user, companyCount, canManageUsers } = await getDocsSession();
  return (
    <DocsShell
      user={user}
      companyCount={companyCount} canManageUsers={canManageUsers}
      current="/docs/caso-practico/resumen"
      breadcrumb={
        <>
          <span aria-hidden>/</span>
          <span className="text-periwinkle-900">Caso práctico · La historia</span>
        </>
      }
    >
      <Badge variant="outline">5 · Caso práctico</Badge>
      <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        Un mes de compras, de punta a punta
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
        Esta es la historia real de una simulación completa con datos de práctica:
        cómo las compras de septiembre llegaron al sistema, quién las revisó, cómo se
        calculó cada cifra y dónde quedó guardada cada prueba. Tres personas
        participan, cada una con su tarea.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            rol: "La auxiliar (María)",
            hace: "Carga el archivo del mes, revisa los avisos y deja la data limpia. No emite comprobantes ni cierra meses.",
          },
          {
            rol: "El contador (Carlos)",
            hace: "Configura las reglas, registra el pago, revisa los cálculos y emite los comprobantes. Solo él puede cerrar el mes.",
          },
          {
            rol: "El auditor (Vargas)",
            hace: "Solo mira: verifica de dónde salió cada cifra y que nadie haya cambiado nada por debajo de la mesa.",
          },
        ].map((p) => (
          <div
            key={p.rol}
            className="rounded-lg border border-periwinkle-200 p-5"
          >
            <p className="text-sm font-semibold">{p.rol}</p>
            <p className="mt-1 text-sm text-periwinkle-600">{p.hace}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold tracking-tight">
        El mes en una mirada
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-periwinkle-600">
        Diez líneas en el archivo original: nueve facturas y una nota de crédito.
        Esto fue lo que el sistema hizo con ellas, sin que nadie copiara nada a mano:
      </p>
      <div className="mt-4">
        <Cifras
          caption="Septiembre simulado: del archivo a los documentos"
          head={["Qué pasó", "Cantidad", "Base", "IVA"]}
          rows={[
            ["Facturas importadas", "9", "9.900,00", "1.572,15"],
            ["Nota de crédito manual", "1", "100,00", "16,00"],
            ["Rechazadas del archivo", "1", "—", "—"],
          ]}
          foot={["Total en compras", "10", "10.000,00", "1.588,15"]}
        />
      </div>

      <div className="mt-6 space-y-3">
        <DocCallout title="La prueba de que el cálculo es consistente">
          El sistema calculó la retención de las 9 facturas al 75% del IVA y mostró
          cada cuenta antes de pedir confirmación: total a retener <strong>1.179,12</strong>,
          con la explicación línea por línea (por ejemplo, 160,00 × 75% = 120,00).
          Nada se emitió sin que un humano lo viera primero.
        </DocCallout>
        <DocCallout title="Lo que esta historia NO hace">
          Los comprobantes de la simulación se previsualizaron pero no se emitieron,
          y el mes no se cerró: faltan decisiones del contador (reglas del impuesto
          sobre la renta, cómo restan las notas de crédito y cómo se redondea). El
          sistema se negó a avanzar sin esas definiciones, y eso también es parte de
          la demostración.
        </DocCallout>
      </div>

      <PasoNav
        next={{ href: "/docs/caso-practico/carga", label: "La carga del mes" }}
      />
    </DocsShell>
  );
}
