import Link from "next/link";
import type { ReactNode } from "react";

/** Paso didáctico en dos columnas: izquierda la guía, derecha lo que pasó en la práctica. */
export function Paso({
  n,
  titulo,
  ruta,
  guia,
  practica,
  hallazgo,
}: {
  n: string;
  titulo: string;
  ruta: string;
  guia: ReactNode;
  practica: ReactNode;
  hallazgo?: ReactNode;
}) {
  return (
    <section
      aria-label={`Paso ${n}: ${titulo}`}
      className="overflow-hidden rounded-lg border border-periwinkle-200"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-periwinkle-200 bg-periwinkle-50/70 px-5 py-3">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#120c27] to-[#352574] text-sm font-bold text-white"
          aria-hidden
        >
          {n}
        </span>
        <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
      </div>
      <p className="border-b border-periwinkle-100 bg-white px-5 py-2 text-xs text-periwinkle-500">
        Dónde: <span className="font-medium text-periwinkle-700">{ruta}</span>
      </p>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b border-periwinkle-100 p-5 md:border-b-0 md:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
            Lo que dice la guía
          </p>
          <div className="mt-2 text-sm text-periwinkle-700">{guia}</div>
        </div>
        <div className="bg-gradient-to-br from-[#120c27]/[.03] to-[#37c8a1]/[.06] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
            Lo que pasó en la práctica
          </p>
          <div className="mt-2 text-sm text-periwinkle-700">{practica}</div>
        </div>
      </div>
      {hallazgo && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          <span className="font-semibold">Hallazgo: </span>
          {hallazgo}
        </div>
      )}
    </section>
  );
}

/** Tabla de cifras con totales al pie. */
export function Cifras({
  head,
  rows,
  foot,
  caption,
}: {
  head: string[];
  rows: string[][];
  foot?: string[];
  caption?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-periwinkle-200">
      {caption && (
        <figcaption className="border-b border-periwinkle-100 bg-periwinkle-50/70 px-4 py-2 text-xs font-medium text-periwinkle-500">
          {caption}
        </figcaption>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
              {head.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-2.5 ${i > 0 ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.join("|")}
                className="border-t border-periwinkle-100"
              >
                {r.map((c, i) => (
                  <td
                    key={`${r[0]}-${i}`}
                    className={`whitespace-nowrap px-4 py-2 font-mono tabular-nums ${i > 0 ? "text-right" : "font-sans"}`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {foot && (
            <tfoot>
              <tr className="border-t-2 border-periwinkle-200 bg-periwinkle-50/70 font-semibold">
                {foot.map((c, i) => (
                  <td
                    key={`f-${i}`}
                    className={`whitespace-nowrap px-4 py-2 font-mono tabular-nums ${i > 0 ? "text-right" : "font-sans"}`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </figure>
  );
}

export function PasoNav({
  prev,
  next,
}: {
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
  return (
    <p className="mt-8 flex flex-wrap gap-4 text-sm">
      {prev && (
        <Link
          href={prev.href}
          className="text-periwinkle-500 hover:text-[#120c27]"
        >
          ← {prev.label}
        </Link>
      )}
      {next ? (
        <Link
          href={next.href}
          className="font-semibold text-[#352574] hover:underline"
        >
          Siguiente: {next.label} →
        </Link>
      ) : (
        <Link
          href="/docs"
          className="font-semibold text-[#352574] hover:underline"
        >
          Volver al índice →
        </Link>
      )}
    </p>
  );
}
