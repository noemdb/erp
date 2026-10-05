# Ruta externa: contador + cliente (n.º 2)

> **Objetivo:** convertir decisiones fiscales y datos reales en artefactos
> firmados que la ingeniería pueda ejecutar sin adivinar. **Nadie en el equipo
> puede sustituir estas firmas.** Pedirlo todo cuesta días; esperar a pedirlo
> cuesta meses (principio 7 del roadmap).

## Paso 1 — Enviar F0-01 (dueño: equipo · límite: lun 05-oct)

Qué se envía (ya listo en `docs/anexos/`):

1. `paquete-contador.md` — qué necesitamos del contador, con respuestas parciales del 01-oct y seguimiento pendiente.
2. `matriz-reglas-v1.md` (borrador) + `checklist-F0.md` — para revisión, no para firmar aún.
3. `cotejo-gaceta-F0.md` — identidad de SNAT/2025/000054, Decreto 1.808 y UT 43 verificada; artículo por artículo pendiente de ejemplar oficial.
4. `decision-abonos-G2-contador.md` — hoja de 4 decisiones G2 para la Sesión 1.
5. Las 18 preguntas del cuestionario consolidado + 5 de formato de reportes + pregunta de ajustes post-cierre + elección de empresa piloto y línea base de tiempos.

Qué se pide de vuelta (con fecha): muestras (paso 2) + slot semanal de sesión + ejemplar oficial de las 3 normas.

## Paso 2 — Muestras reales (dueño: cliente · límite: 16-oct)

Lista cerrada (todo anonimizable antes de entrar al sistema):

| # | Muestra | Aceptación | Si falta o llega incompleta |
|---|---|---|---|
| M-1 | Mes CSV legacy completo (compras+ventas+pagos) | Parseable por `import:autodetect`; ≥1 mes calendario | Se trabaja con corpus sintético **marcado**; M2 no corre |
| M-2 | Reportes Z reales por marca/sucursal | ≥1 Z por máquina con rango y salto documentado | FUN-03 no se valida; Z se difiere a empresa 2 |
| M-3 | Libros del contador del mismo mes (compras, ventas, resumen) | Mismo período que M-1/M-2 | M2/M5 imposibles; gate `golive` NO-GO |
| M-4 | XLSX sobre plantilla original | Abre con `exceljs`; se inventaría con `golden:inspect` sin copiar PII | REP-03 no arranca; Excel sigue ⏳ |

Gate de entrada: `import:autodetect` + `golden:inspect` sobre lo recibido; el informe decide si las muestras bastan o se devuelve pedido (gatillo FUN-05).

## Paso 3 — Sesión 1, decisiones Tier A (dueño: contador · meta: 23-oct)

Agenda cerrada (una sesión, hoja por tema, sin temas Tier B):

1. **G8:** método + etapa (línea/documento/período) + precisión monetaria final → cierra ADR-014 (IMP-01).
2. **G2-a/b/c/d:** qué asiento es abono, base por porción, sustraendo parcial, anticipos → cierra criterio + sustraendo (IMP-02, IMP-03).
3. **Base ISLR y UT aplicable:** con/sin IVA por concepto; UT de inicio vs cierre por período (ver hallazgo en `cotejo-gaceta-F0.md`).
4. **Mínimos PJD y G9:** confirma nota de ISLR-04/05; formato y reinicio ISLR (+ cotejo reinicio IVA).
5. **G1:** lo que falte del cuestionario para el piloto.

Insumos sobre la mesa: candidatos normalizados (`pendientes/TERCERA_REV/files/`, contrato fracción + `base_gravable` ya cerrado), `g8:calibrate` y `g2:divergence` corridos sobre M-1 si llegó.
Salida: **RDF firmado por decisión** (plantilla `RDF-plantilla.md`). Sin RDF no hay código.

## Paso 4 — Matriz v1.0 (dueño: contador · meta: 06-nov)

Lotes 1–2 (IVA + ISLR del piloto) cargados por el workflow borrador→activo
(ADR-022), nunca por seeder directo. El gate ACC-03 exige dorados que
respalden cada activación: matriz sin dorados no activa (fail-closed).

## Paso 5 — Dorados 30–50 firmados (dueño: contador · desde 09-nov, lotes de 10/semana)

Protocolo a ciegas: el contador resuelve a mano en formato `fixtures/`; la
firma va ligada al sha256 del contenido (procedimiento en
`fixtures/tax-scenarios/README.md`); `goldens:check` + `acceptance:gate`
verifican. 17 candidatos + ISLR-07/ABONO-01…03 (con variantes) son la semilla,
no el resultado.

## Qué desbloquea cada entrega

| Entrega | Desbloquea |
|---|---|
| RDF G8 | IMP-01 (redondeo), retira `round2` provisional |
| RDF G2 + matriz | IMP-02/03/04, FUN-01 (catálogos por lotes) |
| M-1…M-4 | FUN-03/05, REP-03/04, M2 (libros mes real = libros contador) |
| Matriz + primeros dorados | REP-04, E2E con datos, UAT |
| 30 firmados + M5-retro/vivo | Cutover (ACC-12), go-live |

## Plan B (si la ruta externa se atasca)

- Contador sin tiempo → sesiones de 30 min con hoja cerrada por tema + **diferimientos formales Tier B** (plantilla `diferimiento-plantilla.md`): G4/G7/G11/G12/roles se cierran o difieren por escrito, no se arrastran.
- Muestras tardías → corpus sintético marcado + calibración G8/G2 sobre sintético; M2/M5 se recorren al primer mes real (la sombra pasa a enero si H1 cae después del 30-nov; diciembre exige confirmar al contador).
