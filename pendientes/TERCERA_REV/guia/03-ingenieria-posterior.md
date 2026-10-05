# Ingeniería posterior: desbloqueada por firma o aprobación (n.º 3)

> **Objetivo:** qué se construye cuando la ruta externa (o el dueño) libere su
> precondición, en qué orden y con qué aceptación. Nada aquí adelanta decisión
> fiscal: cada ítem cita su desbloqueador exacto.

## Orden de ataque (por dependencias, no por apetito)

```
muestras + RDF G8/G2 ─▶ IMP-01/02/04 ─▶ REP-03/04 (M2) ─▶ M5-retro ─▶ M5-vivo ─▶ cutover
matriz + dorados ──────▶ FUN-01 ──────▶ E2E P0 ─▶ UAT ─▶ capacitación ─▶ go-live
aprobación dueño ──────▶ ACC-08 (sombra) ─┬▶ M5-vivo
costo aprobado ────────▶ OPS-04 ─▶ OPS-06 (restore drill) ─┴▶ ORR ─▶ Go/No-Go
```

## Fichas por ítem

### IMP-01/02/04 — Motor según RDF (desbloquea: Sesión 1)

- IMP-01 (G8): aplica combinación ganadora de `g8:calibrate`, cierra ADR-014, retira `round2` provisional, re-ejecuta dorados. Aceptación: 100% dorados verdes con redondeo firmado.
- IMP-02 (G2): base por porción, sustraendo parcial, anticipos. Aceptación: ISLR-07/ABONO-01…03 resueltos a una variante por RDF + tests.
- IMP-04 (G9): series configurables (`reset_policy`), formato ISLR, siembra inicial. Aceptación: comprobante ISLR real emitido en serie con formato firmado.

### FUN-01 — Catálogos reales por lotes (desbloquea: matriz v1.0)

Carga vía workflow ADR-022 (borrador→activo con ACC-03), nunca por seeder
directo. Aceptación: lote 1 visible en UI como borrador + activación del
contador registrada en auditoría.

### REP-03/04 + M2 (desbloquea: M-1…M-4 y G8 firmado)

- REP-03: comparador contra golden real (mapa de celdas, tolerancias, informe).
- REP-04/M2: libros del mes real = libros del contador, diferencias D1–D5 clasificadas y aprobadas. Aceptación: `acceptance:gate --profile=golive` en FISCAL pasa M2.

### OPS-04 — Copia externa (desbloquea: decisión de costo del dueño)

Verificar con el proveedor (retención, versionado, exportación, ubicación);
copia externa cifrada de BD + PITR + copia de blobs direccionada por `sha256`;
plan de salida del almacenamiento. Aceptación: restore conjunto BD+blobs con
verificación de `sha256` (ensayo de OPS-06). Sin esto no entra dato real.

### OPS-05/06 — Ledger externo + restore drill (desbloquea: OPS-04)

Confirmar destino append-only del ledger fuera de la BD; procedimiento
post-restore (bloquear emisión → comparar → resembrar → desbloquear).
Drill D1–D5 con RPO/RTO medidos y runbook con tiempos reales.

### ACC-08 — Modo sombra (desbloquea: aprobación del dueño)

Serie de ensayo + marca de agua + sin entrega + número externo (evita
duplicados de numeración). Es el carril donde corre M5-vivo: un mes calendario
completo en paralelo con diferencias D1–D5 aprobadas.

### ACC-06/07 — E2E P0 + resto (desbloquea: parcial — arnés ✅, datos de UAT)

P0 por rol + negativos + seguridad (con lo ya construido en ACC-05); cross-browser,
a11y y rendimiento pueden ir a hypercare si el dueño lo aprueba (palanca MVP).
Aceptación: `npx playwright test` verde en CI.

### ACC-09/10/11/12 + OPS-07/08/10 — UAT, capacitación, piloto, cutover

Precondiciones: E2E P0 verde + usuarios y fechas del cliente (pedir 20-nov) +
empresa piloto elegida (30-oct) + H1 completo. Cierran con ORR, Go/No-Go,
congelación T−14, siembra de series y acta firmada.

## Tablero mínimo de seguimiento (semanal, 30 min)

Burn-up de ítems por categoría · decisiones firmadas ÷ requeridas · dorados
firmados ÷ 30 · cobertura de reglas · incidentes abiertos · desvío
estimado-vs-real (recalibrar tras H0, principio 8).
