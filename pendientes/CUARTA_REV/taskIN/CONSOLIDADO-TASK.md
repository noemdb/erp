# Tasks pendientes CUARTA_REV — consolidado único (2026-10-05)

> Fuente: `pendientes-implementacion-2026-10-02.md` + ENMIENDA v1.1 + `docs/TODO.md`
> al 2026-10-05. Lo ya cerrado (purge SEC-04, escáner SEC-02′, F0-01 enviado,
> intake verificado, Playwright P0, ISLR PDF, deuda DOC-01…05) no aparece.
> Leyenda: 🔲 pendiente · 🧪 en curso / cancha externa · ⛔ bloqueado.

## Externas — ruta crítica (contador/cliente)

### T01 — Respuestas al pedido F0-01 🧪
Dueño contador · Enviado 2026-10-05 (`docs/anexos/pedido-F0-01.md`): 18 preguntas
(asesoría §9) + 5 formato (ROADMAP-03 §3.7) + post-cierre + piloto/tiempos.
Aceptación: cada punto APROBADO / MODIFICAR / PENDIENTE con fecha; anotar canal+acuse.
Desbloquea T02, T03.

### T02 — Muestras M-1…M-4 🧪
Dueño cliente · Límite 16-oct · Pedidas en F0-01. Aceptación: M-1 CSV ≥1 mes parseable
por `import:autodetect`; M-2 ≥1 Z por máquina con rango/salto; M-3 libros mismo período;
M-4 XLSX con `exceljs` sin PII. Gate: autodetect + golden-inspect deciden si bastan
(gatillo FUN-05). Intake verificado 05-oct. Si falta: sintético marcado, M2 no corre.
Desbloquea T08, T09, T10.

### T03 — Sesión 1 Tier A 🔲
Dueño contador · Meta 23-oct · Agenda guía 02 Paso 3: G8 (cierra ADR-014), G2-a/b/c/d,
base ISLR+UT, mínimos+G9, G1. Insumos: candidatos normalizados + `g8:calibrate` /
`g2:divergence` sobre M-1 si llegó. Salida: RDF firmado por decisión. Sin RDF no hay código.
Desbloquea T04, T06, T07.

### T04 — Matriz reglas v1 firmada ⛔ (tras T03)
Dueño contador · Meta 06-nov · Base `matriz-reglas-v1.md` (borrador). Lotes 1–2 por
workflow borrador→activo (ADR-022), nunca seeder. Gate ACC-03 fail-closed.
Desbloquea T05, T08, T10.

### T05 — Dorados 30–50 firmados ⛔ (tras T04)
Dueño contador · Desde 09-nov, 10/semana. Protocolo a ciegas en formato `fixtures/`,
firma ligada a sha256; `goldens:check` + `acceptance:gate` verifican. Semilla: 17
candidatos + ISLR-07/ABONO-01…03. Gate: 100% verde o F2 no cierra; 30 + M5 → cutover.
Desbloquea T10, T11.

## Ingeniería — tras firma/muestra

### T06 — IMP-01 redondeo + tolerancia única ⛔ (tras RDF G8)
Actualizar ADR-014, retirar `round2` provisional, unificar tolerancia (hoy 0.01 provisional;
Inv.8 "0" es meta M5). Aceptación: dorados G8 verdes + `g8:calibrate` limpio.

### T07 — IMP-02/03/04 G2 + IVA consume eventos ⛔ (tras RDF G2)
Criterio configurado, sustraendo parcial PNR, IVA consume `settlement_events`;
fail-closed hasta firma. Aceptación: preview dual converge + `g2:divergence` limpio +
ABONO-01…03 verdes.

### T08 — FUN-01 catálogos + FUN-03 modo Z + FUN-05 perfiles ⛔ (T04 / M-1…M-2)
Valores reales por lotes; Z con mes real por sucursal sin duplicidad; perfiles solo si
autodetección lo exige (gatillo 1 ya visto en Z sintéticas). Aceptación: caso real + contador.

### T09 — REP-03 Excel + REP-04 paridad + deudas render ⛔ (M-4 + formato)
Mapa de celdas contra golden, generadores sobre plantilla, paridad art. 16; menores:
`summary/v1`, `pdf_sha256` ISLR (o no-migrar), tablero pendientes UI.
Aceptación: L1–L4 en CI + D1–D5 sin abiertas.

### T10 — M2 mes real + M5 + sombra ACC-08 ⛔ (T02+T04+T05)
Libros = libros contador, diferencias D1–D5 aprobadas; M5-retro/vivo; paralelo Excel.
Aceptación: M2/M5 firmados, D1 abiertas = 0. Desbloquea T11.

### T11 — UAT + cutover + go-live ⛔ (tras T10)
Guiones listos (`uat/`, `manuales/`, checklist, acta). UAT por rol, drill RPO/RTO, ORR,
cutover, go-live (30 dorados + M5 + checklist verde). Aceptación: acta firmada.

## Hardening interno — sin dependencia externa

### T12 — SEC-03 rotación secretos + revisión servidor 🔲
Runbook incidente §1+§3 (filas pendientes §6): clave vieja rechazada, registros revisados;
rotar DB owner/app_runtime, AUTH_SECRET, FILE_SIGNING, almacenamiento, seeds.
Si indicio de uso ajeno ⇒ reconstruir. Aceptación: tabla §6 firmada.

### T13 — Rol mínimo + restore drill 🔲
`DB_LEAST_PRIVILEGE=true` en staging (dev sigue owner hasta migrar seeds a `withTenant`);
drill real con RPO/RTO registrados.

### T14 — Alineación docs-código + E-3 🔲 (0.5–1d)
ARCHITECTURE/API → auth propio, render fuera TX, pg-boss diferido. E-3: `origin` en schema
o migración (+0.25–0.5d). Aceptación: sin spec vieja; guardia prod con `--matrix-hash`.

### T15 — Tablero semanal 🔲
Firmadas÷requeridas, dorados÷30, cobertura reglas, incidentes, desvío real; spillover
S1→S2 explícito. Primera edición al cierre de H0 (recalibrar k).
