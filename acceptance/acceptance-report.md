# Acceptance report — ERP TributarioLite

- Fecha: 2026-10-01T18:41:52.541Z
- App: erp-tributario-lite 0.1.0 (Node v22.23.1)
- Matriz fiscal: borrador-no-firmada
- Fixtures golden: IVA-01-compra-gravada.json
- Migraciones aplicadas (journal): 18
- Suites técnicas: 32 archivos (*.test.ts)
- Base de datos: Neon dev PG16 (ver .env)

## Resultados por suite (adjuntar salida de CI)

| Suite | Resultado | Evidencia |
|---|---|---|
| golden (fixtures) | pendiente firma contador | test-results/golden-results.json |
| properties (fast-check) | ver CI | test-results/property-tests.json |
| multitenant/fuga | ver CI | — |
| concurrencia 50 | ver CI | — |
| e2e servicios | ver CI | — |
| período real M2/M5 | BLOQUEADO: sin muestras | period-reconciliation/ |

## Gates 4.7 (requieren contador/cliente)

dorados firmados 100% · fugas 0 · emisiones 50–100 sin duplicados/huecos · E2E 100% · período conciliado 100% · diferencias no aprobadas 0 · evidencia reproducible 100%.

## Corrida 2026-10-01T19:29:05.339Z

- Archivos: 32/32 ok · Tests: 48 pasados, 0 fallidos
- Golden: 4/4 ok · Propiedades: 1/1 ok
