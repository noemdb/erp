import Link from "next/link";
import MenuBook from "@mui/icons-material/MenuBook";
import { Badge } from "@/components/ui/badge";
import { DocsShell, getDocsSession, StatusBadge } from "./_components";
import { FlowButton, type FlowProcess } from "./_flows";
import { DOC_SECTIONS } from "./content";

const FLOWS_BY_HREF: Record<string, FlowProcess> = {
  "/docs/registrar/compras": "compras",
  "/docs/registrar/ventas": "ventas",
  "/docs/registrar/pagos": "pagos",
  "/docs/comprobantes/iva": "iva",
  "/docs/comprobantes/islr": "islr",
  "/docs/comprobantes/recibidas": "recibidas",
  "/docs/datos-base/terceros": "terceros",
  "/docs/datos-base/importaciones": "importaciones",
  "/docs/datos-base/reglas": "reglas",
  "/docs/datos-base/decisiones": "decisiones",
  "/docs/datos-base/configuracion": "configuracion",
  "/docs/datos-base/plazos": "plazos",
  "/docs/control/periodos": "periodos",
  "/docs/control/libro-compras": "libro-compras",
  "/docs/control/libro-ventas": "libro-ventas",
  "/docs/control/resumen-iva": "resumen-iva",
  "/docs/control/bitacora": "bitacora",
};

export default async function DocsPage() {
  const { user, companyCount } = await getDocsSession();
  return (
    <DocsShell user={user} companyCount={companyCount}>
      <div className="flex items-center gap-2">
        <Badge variant="outline">Ayuda de usuario</Badge>
        <StatusBadge status="disponible" />
      </div>
      <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
        <MenuBook className="h-8 w-8" aria-hidden />
        Documentación
      </h1>
      <div className="mt-4 w-full space-y-3 text-sm text-periwinkle-700">

        <p className="mt-4 max-w-2xl text-sm text-periwinkle-500">
          Guía ordenada para el usuario final: se registra una sola vez en{" "}
          <strong>Registrar</strong>, el sistema deriva comprobantes, libros y
          cierres. Vocabulario según glosario fiscal (documento fiscal, base
          imponible, comprobante, período fiscal).
        </p>
        
        <p>
          <strong className="text-[#120c27]">¿Qué es este sistema?</strong>{" "}
          Es tu aliado para dejar atrás el Excel lleno de fórmulas frágiles:
          aquí anotas cada compra, venta o pago una sola vez, y el sistema se
          encarga de armar tus libros, tus comprobantes y tu resumen sin que
          tengas que copiar nada a mano.
        </p>
        <p>
          <strong className="text-[#120c27]">¿Para qué es este sistema?</strong>{" "}
          Para que cierres el mes tranquilo: sin cifras que no cuadran, sin
          números de comprobante repetidos o saltados, sin miedo a que un
          error de dedo te cueste una multa. Todo queda guardado, ordenado y
          con su explicación.
        </p>
        <p>
          <strong className="text-[#120c27]">¿Para qué sirve?</strong> Sirve
          para trabajar menos y con más confianza: subes o registras tus
          documentos, emites tus comprobantes con un clic, descargas tus
          libros y, si alguien pregunta “¿de dónde salió este número?”,
          llegas al documento original en segundos.
        </p>
      </div>
      <div className="mt-8 space-y-6">
        {DOC_SECTIONS.map((s) => (
          <section
            key={s.id}
            aria-label={s.title}
            className="rounded-md border border-periwinkle-200 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {s.id}. {s.title}
              </h2>
              <StatusBadge status={s.status} />
            </div>
            <p className="mt-1 text-sm text-periwinkle-500">{s.tagline}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {s.pages.map((p) => (
                <li
                  key={p.href}
                  className="rounded-md border border-periwinkle-100 px-4 py-3"
                >
                  {p.available ? (
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={p.href}
                        className="text-sm font-semibold text-[#352574] hover:underline"
                      >
                        {p.title} →
                      </Link>
                      {(() => {
                        const proc = FLOWS_BY_HREF[p.href];
                        return proc ? <FlowButton process={proc} /> : null;
                      })()}
                    </span>
                  ) : (
                    <p className="text-sm font-semibold text-periwinkle-400">
                      {p.title} · pronto
                    </p>
                  )}
                  <p className="mt-0.5 text-sm text-periwinkle-600">
                    {p.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DocsShell>
  );
}
