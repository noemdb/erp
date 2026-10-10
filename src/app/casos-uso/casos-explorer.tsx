"use client";

import { useMemo, useState } from "react";
import ArrowForward from "@mui/icons-material/ArrowForward";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Search from "@mui/icons-material/Search";
import Warning from "@mui/icons-material/Warning";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { ManualLayout } from "../manual/manual-layout";
import { FlowButton } from "../docs/_flows";
import type { FlowProcess } from "../docs/_flows";
import type { Caso, Regimen } from "./casos";

type Flujo = { title: string; steps: string[]; note: string; flow?: FlowProcess };

function Flow({ steps }: { steps: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Diagrama de flujo">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          {i > 0 && <ArrowForward className="h-3.5 w-3.5 shrink-0 text-icy-aqua-600" aria-hidden />}
          <span className="rounded-md bg-periwinkle-100 px-2.5 py-1 text-[11px] font-medium text-periwinkle-800">{s}</span>
        </span>
      ))}
    </div>
  );
}

type EstadoFiltro = "todos" | "disponible" | "parcial" | "requiere";

function categoria(f: { estado: { label: string; ok: boolean } }): Exclude<EstadoFiltro, "todos"> {
  if (!f.estado.ok) return "requiere";
  return f.estado.label === "Parcial" ? "parcial" : "disponible";
}

export function CasosExplorer({ regimenes, flujos }: { regimenes: Regimen[]; flujos: Flujo[] }) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("todos");

  const filtrados = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return regimenes
      .map((r) => ({
        ...r,
        fns: r.fns.filter((f) => {
          if (estado !== "todos" && categoria(f) !== estado) return false;
          if (!needle) return true;
          const hay = [f.title, f.body, f.pantalla, f.estado.label, f.estado.note ?? "", ...f.steps, ...f.ejemplo.lines]
            .join("\n")
            .toLowerCase();
          return hay.includes(needle);
        }),
      }))
      .filter((r) => r.fns.length > 0);
  }, [regimenes, q, estado]);

  const total = regimenes.reduce((acc, r) => acc + r.fns.length, 0);
  const visibles = filtrados.reduce((acc, r) => acc + r.fns.length, 0);
  const filtrando = q.trim() !== "" || estado !== "todos";

  return (
    <ManualLayout
      roles={filtrados.map((r) => ({ id: r.id, rol: r.rol, badge: r.badge, fns: r.fns.map((f) => ({ id: f.id, title: f.title })) }))}
    >
        <div className="relative">
          <Badge variant="outline" className="rounded-md px-3 py-1">
            {filtrando ? `${visibles} de ${total} casos` : `${total} casos · ${regimenes.length} grupos`}
          </Badge>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Casos de Uso</h1>
          <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
            Cómo interactuar con la plataforma para obtener cada reporte de cierre,
            paso a paso y con ejemplo. Cifras y terceros 100% ficticios.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex flex-1 items-center gap-2 rounded-md border border-periwinkle-200 bg-white px-3 py-2 focus-within:border-[#37c8a1]">
              <Search className="h-4 w-4 shrink-0 text-periwinkle-400" aria-hidden />
              <span className="sr-only">Buscar casos</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por reporte, pantalla o palabra (p. ej. quincena, XML, correlativo)…"
                className="w-full bg-transparent text-sm text-periwinkle-900 outline-none placeholder:text-periwinkle-300"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-periwinkle-500">
              Estado
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoFiltro)}
                className="rounded-md border border-periwinkle-200 bg-white px-2 py-2 text-sm text-periwinkle-900 outline-none focus:border-[#37c8a1]"
              >
                <option value="todos">Todos</option>
                <option value="disponible">Disponible</option>
                <option value="parcial">Parcial</option>
                <option value="requiere">Requiere decisión</option>
              </select>
            </label>
            {filtrando && (
              <button
                type="button"
                onClick={() => { setQ(""); setEstado("todos"); }}
                className="rounded-md px-3 py-2 text-sm font-medium text-[#352574] hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {visibles === 0 && (
          <p role="status" className="mt-10 rounded-md border border-periwinkle-200 bg-periwinkle-50 px-4 py-6 text-center text-sm text-periwinkle-500">
            Sin casos para ese filtro. Prueba con “libro”, “quincena” o limpia el filtro.
          </p>
        )}

        {filtrados.map((r, ri) => (
          <section key={r.id} id={r.id} aria-label={`Casos ${r.rol}`} className="mt-10 scroll-mt-24">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{r.rol}</h2>
              <Badge variant="secondary">{r.badge}</Badge>
            </div>
            <p className="mt-1 text-sm text-periwinkle-500">{r.intro}</p>
            <div className="mt-5 space-y-4">
              {r.fns.map((f, i) => (
                <Reveal key={f.id} delay={(i % 4) * 60}>
                  <Card id={f.id} className="scroll-mt-24 overflow-hidden rounded-lg">
                    <div className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]" aria-hidden />
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base tracking-tight">{f.title}</CardTitle>
                        <Badge variant={f.estado.ok ? "success" : "warning"} className="flex items-center gap-1">
                          {f.estado.ok
                            ? <CheckCircle className="h-3 w-3" aria-hidden />
                            : <Warning className="h-3 w-3" aria-hidden />}
                          {f.estado.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm leading-relaxed text-periwinkle-700">
                      <p>{f.body}</p>
                      <ol className="mt-2.5 space-y-1.5">
                        {f.steps.map((s, n) => (
                          <li key={s} className="flex gap-2">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-periwinkle-100 text-[11px] font-bold text-[#120c27]" aria-hidden>
                              {n + 1}
                            </span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-3 rounded-md bg-periwinkle-50 px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-periwinkle-500">{f.ejemplo.title}</p>
                        <ul className="mt-1.5 space-y-1 font-mono text-xs tabular-nums text-periwinkle-800">
                          {f.ejemplo.lines.map((l) => (
                            <li key={l}>{l}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="mt-2.5 text-xs text-periwinkle-500">
                        Pantalla: <span className="font-medium text-periwinkle-700">{f.pantalla}</span>
                        {f.estado.note && <span className="mt-1 block">{f.estado.note}</span>}
                      </p>
                      {f.flow && (
                        <div className="mt-2">
                          <FlowButton process={f.flow} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
            {ri < filtrados.length - 1 && <div className="mt-8 border-b border-periwinkle-100" aria-hidden />}
          </section>
        ))}

        <section id="diagramas" aria-label="Flujos de cierre" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight">Flujos de cierre</h2>
          <p className="mt-1 text-sm text-periwinkle-500">Los dos recorridos completos, de la carga al paquete.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {flujos.map((d, i) => (
              <Reveal key={d.title} delay={(i % 2) * 80}>
                <Card className="h-full overflow-hidden rounded-lg">
                  <div className="h-1 bg-gradient-to-r from-[#37c8a1] via-[#352574] to-[#120c27]" aria-hidden />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base tracking-tight">{d.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Flow steps={d.steps} />
                    <p className="mt-3 text-xs leading-relaxed text-periwinkle-500">{d.note}</p>
                    {d.flow && (
                      <div className="mt-2">
                        <FlowButton process={d.flow} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>
    </ManualLayout>
  );
}
