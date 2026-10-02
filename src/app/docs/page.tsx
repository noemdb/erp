import Link from "next/link";
import MenuBook from "@mui/icons-material/MenuBook";
import { Badge } from "@/components/ui/badge";
import { DocsShell, getDocsSession, StatusBadge } from "./_components";
import { DOC_SECTIONS } from "./content";

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
      <div className="mt-4 max-w-2xl space-y-3 text-sm text-periwinkle-700">
        <p>
          <strong className="text-[#120c27]">¿Qué es este sistema?</strong>{" "}
          ERP-TributarioLite es el sistema web multiempresa donde se registran
          compras, ventas, pagos y retenciones una sola vez para derivar
          libros de IVA, resumen y comprobantes IVA/ISLR en PDF/Excel.
        </p>
        <p>
          <strong className="text-[#120c27]">¿Para qué es este sistema?</strong>{" "}
          Para que administrativos, contadores y auditores dejen el Excel
          frágil y el software legacy: cada hecho fiscal entra una vez como
          fuente única de verdad y el motor versionado calcula, numera sin
          huecos y congela cierres con trazabilidad total.
        </p>
        <p>
          <strong className="text-[#120c27]">¿Para qué sirve?</strong> Sirve
          para importar o registrar documentos, emitir comprobantes
          inmutables, generar libros y resumen reproducibles, cerrar períodos
          y responder “¿de dónde salió esta cifra?” en ≤3 clics.
        </p>
      </div>
      <p className="mt-4 max-w-2xl text-sm text-periwinkle-500">
        Guía ordenada para el usuario final: se registra una sola vez en{" "}
        <strong>Registrar</strong>, el sistema deriva comprobantes, libros y
        cierres. Vocabulario según glosario fiscal (documento fiscal, base
        imponible, comprobante, período fiscal).
      </p>
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
                    <Link
                      href={p.href}
                      className="text-sm font-semibold text-[#352574] hover:underline"
                    >
                      {p.title} →
                    </Link>
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
