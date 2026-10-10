# Requerimiento — Reportes de cierre por período (pedido del cliente)

> **Estado:** propuesta, no firmada · **Actualizado:** 2026-10-09 · **Dueño:** equipo + contador cliente
> **Fuente:** texto del cliente recibido 2026-10-09 (ver `01-requerimiento-cliente.md` §0).
> Este directorio es **intake en `blueprint/`** (fuente histórica). Nada aquí es regla activa:
> los valores fiscales solo valen con matriz v1 firmada + RDF (`docs/anexos/`), y el trabajo
> solo existe cuando entra a `docs/TODO.md` + `docs/API.md` + `docs/DATABASE.md`.

## Contenido

| Archivo | Qué es |
|---|---|
| `01-requerimiento-cliente.md` | Texto original + versión mejorada y detallada, por régimen (ordinario mensual / especial quincenal), con idioma ubicuo `docs/DOMAIN.md` |
| `02-roadmap-fases.md` | Roadmap inicial por fases R0–R5: alcance, aceptación, dependencias y mapeo a F0–F7 |
| `03-pendientes-cliente.md` | Especificación detallada de cada dependencia externa (M-1…M-4, matriz v1, G9, Q14, G1/G7): qué entregar, formato, aceptación, a qué bloquea y dueño (con estado a 2026-10-09) |
| `04-ficha-seniat-xml-txt.md` | Propuesta documental de layouts SENIAT (XML Forma 99074 + TXT Forma 35) con qué pedir en Q14; sin código hasta spec oficial |

## Lectura rápida

- **Ordinario** → `period_kind = monthly`. Cierre y reportes por mes calendario.
- **Especial** → `period_kind = biweekly`. Cierre y reportes por quincena
  (Q1 `[01,16)`, Q2 `[16,01-del-mes-siguiente)`); solo el XML de ISLR es mensual.
- **8 reportes** en total (4 ordinario + 8 especial, con solape). Detalle en `01-...`.
- **Gates abiertos que condicionan todo:** G1 (período por empresa), G9 (numeración ISLR),
  G8 (redondeo), Q14 del pedido F0-01 (¿TXT/XML SENIAT en v1? — `docs/anexos/pedido-F0-01.md` B-14),
  muestras M-1…M-4 y matriz v1 firmada.

Ver también: `docs/PROJECT.md`, `docs/DOMAIN.md`, `docs/API.md` (reporting/periods),
`docs/DATABASE.md` (`fiscal_periods`, `generated_reports`), `docs/anexos/checklist-F0.md`,
`docs/anexos/matriz-reglas-v1.md`, `blueprint/ROADMAP-ERP-TributarioLite.md`.
