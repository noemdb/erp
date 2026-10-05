# Tasks pendientes TERCERA_REV — índice (2026-10-05)

> Fuente: `pendientes-implementacion-2026-10-02.md` + ENMIENDA v1.1 + estado
> `docs/TODO.md` al 2026-10-05. Lo ya cerrado (purge SEC-04, escáner SEC-02′,
> F0-01 enviado, intake verificado, Playwright P0, ISLR, deuda DOC-01…05) no
> aparece aquí. Leyenda: 🔲 pendiente · 🧪 en curso / en cancha externa ·
> ⛔ bloqueado hasta firma/muestra.

## Externas (contador/cliente) — ruta crítica

| Task | Tema | Dueño | Límite | Estado |
|---|---|---|---|---|
| T01 | Respuestas 18+5+P al pedido F0-01 | Contador | — | 🧪 pedido enviado 05-oct |
| T02 | Muestras M-1…M-4 | Cliente | 16-oct | 🧪 pedidas 05-oct |
| T03 | Sesión 1 Tier A (G8, G2, base+UT, mínimos+G9, G1) → RDFs | Contador | 23-oct | 🔲 |
| T04 | Matriz reglas v1 firmada (lotes IVA+ISLR piloto) | Contador | 06-nov | ⛔ tras T03 |
| T05 | Dorados 30–50 firmados (lotes 10/sem) | Contador | desde 09-nov | ⛔ tras T04 |

## Ingeniería (tras firma/muestra)

| Task | Tema | Depende de | Estado |
|---|---|---|---|
| T06 | IMP-01 redondeo + tolerancia única | RDF G8 (T03) | ⛔ |
| T07 | IMP-02/03/04 G2 + IVA consume eventos | RDF G2 (T03) | ⛔ |
| T08 | FUN-01 catálogos + FUN-03 modo Z + FUN-05 perfiles si gatillo | T04 / M-1…M-2 | ⛔ |
| T09 | REP-03 Excel plantilla + REP-04 paridad art.16 + deudas render menores | M-4 + formato (T01) | ⛔ |
| T10 | M2 mes real + M5 + sombra ACC-08 | T02+T04+T05 | ⛔ |
| T11 | UAT + cutover + go-live (firmas, drill, ORR) | T10 | ⛔ |

## Hardening interno (sin dependencia externa)

| Task | Tema | Estado |
|---|---|---|
| T12 | SEC-03 rotación secretos + revisión servidor §1/§3 runbook | 🔲 |
| T13 | `DB_LEAST_PRIVILEGE` staging + seeds a `withTenant` + restore drill RPO/RTO | 🔲 |
| T14 | Alinear ARCHITECTURE/API con ADR-027/030/031 + E-3 schema `origin` seeder | 🔲 |
| T15 | Tablero semanal (firmadas÷requeridas, dorados÷30, desvío S1→S2) | 🔲 |
