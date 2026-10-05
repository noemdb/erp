# CONVENTIONS.md — ERP-TributarioLite

> Consistencia para 1 dev + agentes IA. Se refina tras cada auditoría. Subordina a `DOMAIN.md` (idioma ubicuo), `DATABASE.md` (schema), `API.md` (contrato), `SECURITY.md` (controles).

## Estructura de carpetas

```
src/
  modules/
    identity/       # users, sessions, login/logout, company_user
    tenancy/        # companies, branches, withTenant(), authorize()
    parties/        # parties, party_tax_profiles (+repo, schemas, service)
    fiscal-docs/    # purchases, settlement events, allocations
    sales/          # sales_documents + lines, modo Z por empresa
    payments/       # eventos de liquidación (payment/account_credit) y asignaciones
    tax-engine/     # puro: computeDocumentTaxes, computeIva/IslrWithholding, explanation
    imports/        # source_files, batches, rows, parser, mappings
    withholdings/   # rules, series, iva/islr issue/void, certificados
    rules/          # workflow borrador→activo (Fiscal Change Control, ADR-022)
    periods/        # fiscal_periods, checklist, close/reopen
    deadlines/      # fiscal_obligations, fiscal_holidays, tablero
    received/       # withholdings_received + links (G3, sin neteo en resumen)
    reporting/      # libros, resumen, conciliación, pdf/excel
    audit/          # audit.record() append-only
    attachments/    # upload privado, urls firmadas
    shared/         # decimal, rif, dates, errors (códigos API.md)
  app/
    (auth)/         # login, reset
    (app)/[companyId]/ # dashboard, compras, ventas, retenciones, reportes, cierre
    api/companies/[companyId]/... # solo upload/download/health
drizzle/
  schema/           # fuente TS (Drizzle) por módulo
  migrations/NNNN_*.sql + custom/ (RLS, triggers, EXCLUDE, REVOKE)
fixtures/
  tax-scenarios/*.json  # dorados contador (30–50)
  csv-corpus/           # legacy + Z reales y adversariales
  golden-master/*.xlsx  # plantillas originales cliente
tests junto al código (`*.test.ts` al lado del módulo, no `tests/` raíz)
docs/               # PROJECT, ARCHITECTURE, DOMAIN, DATABASE, API, SECURITY, DECISIONS, TODO
```

Reglas: módulos solo se hablan por `index.ts` público. `tax-engine` no importa DB/red/reloj. Cliente DB solo en `modules/tenancy` (withTenant/authorize) y `modules/*/repo`; tests pueden usarlo para sembrar/limpiar. `app/` solo orquesta UI, sin lógica fiscal.

## Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes React | PascalCase | `PurchaseForm`, `WithholdingPreview` |
| Archivos TS/UI | kebab-case | `with-tenant.ts`, `purchase-document.ts` |
| Variables/funciones | camelCase, verbos acción | `computeIvaWithholding`, `issueWithholding` |
| Tipos/Zod | PascalCase + `Schema` | `PurchaseDocumentSchema` |
| Tablas DB | snake_case plural | `purchase_documents`, `iva_withholdings` |
| Columnas DB | snake_case | `fecha_fiscal`, `company_id`, `rule_version_id` |
| Migraciones | `NNNN_descripcion.sql` | `0006_init_fiscal_docs.sql` |
| Rutas app | `[companyId]` siempre | `(app)/[companyId]/compras` |
| Handlers API | `/api/companies/[companyId]/...` | `/api/companies/[id]/reports/purchase-book` |
| Códigos error | SCREAMING_SNAKE | `PERIOD_CLOSED`, `DUPLICATE_DOCUMENT` |
| Series | `period_key YYYYMM` o `YYYYMM-Q1/Q2` | `202609`, `202609-Q1` |

Idioma: código y comentarios en inglés técnico, UI/errores usuario en es-VE. Dominio siempre según `DOMAIN.md` (p.ej. `base_imponible`, no `subtotal`; `comprobante`, no `certificado`). Sinónimos = deuda vocabulario.

## Estilo de código

- TypeScript `strict`, `noUncheckedIndexedAccess`. Prettier + ESLint + `eslint-plugin-boundaries` + `dependency-cruiser` en CI (fronteras §4.3 ARCHITECTURE).
- Dinero: string decimal + `decimal.js`, `numeric(18,2)` / `numeric(18,6)` tasas. Prohibido `number/float` para dinero (lint custom si posible).
- Fechas: `date` fiscal vs `timestamptz` UTC instantes. Negocio `America/Caracas` solo presentación. `asOf` explícito en motor, sin `Date.now()` en `tax-engine`.
- RIF: guarda `rif` normalizado (`citext` upper sin guiones) + `rif_original`. Valida estructura, no inventa dígito.
- Errores: `{ error: { code, message, details? } }` con códigos `API.md`. Mensajes UI es-VE, sin PII en logs.
- Formato presentación: coma decimal es-VE en UI/Excel, punto en almacenamiento/transporte.

## Patrones preferidos

- Servidor primero: Server Components + revalidación, Server Actions tipadas. Estado cliente solo UI local (filtros, wizard import).
- `withTenant(ctx, fn)` en toda TX + `authorize()` en una capa. `SET LOCAL` por TX.
- Motor puro: `(company, counterparty, doc, asOf, rules filtradas) => { amounts, ruleVersionId, ruleSnapshot, explanation[] }`. Determinista byte a byte.
- Emisión transaccional: lock → `UPDATE series RETURNING` → snapshot + HTML inmutable → `issued` + audit en TX; render PDF **fuera** de la TX, idempotente post-commit con reintentos (ADR-027). Fallo = rollback sin consumir número.
- Import staging: crudo `JSONB` + normalizado + errores por fila, idempotencia `sha256` + clave natural, diferencia retención marcada no sobrescrita.
- Reportes derivados: libros desde documentos, `data_snapshot + sha256` versionado, drill-down total→documento→fila CSV.
- `audit.record(tx, { action, entity, before/after, reason })` en misma TX.

## Patrones a evitar

- Lógica fiscal en componentes/UI o duplicada en cliente. El cliente muestra `explanation[]`, no recalcula.
- Queries directas en frontend, importar cliente DB fuera `*/repo`, `MAX()+1` o secuencias para numeración (huecos), edición in-place de emitido/cerrado (usar anula/sustituye/ajuste).
- `float` dinero, `Date.now()` en motor, DSL genérico reglas (parámetros tabla + semántica TS), hardcodear 75%/UT/vencimientos.
- Insert directo CSV a documentos sin staging/validación/confirmación. Editar migraciones aplicadas (nueva migración + ADR).
- `console.log` con PII, URLs descarga permanentes, `*` CORS prod.

## Commits / ramas

- Conventional Commits: `feat(fiscal-docs): ...`, `fix(withholdings): ...`, `docs: ...`, `test: ...`, `chore: ...`. Un bloque = PR pequeño con tests.
- Ramas: `main` protegida (CI verde), `feat/*`, `fix/*`. Sin push directo. Cada migración destructiva = ADR + backup + ventana.

## Testing

- Vitest unit motor con `fixtures/tax-scenarios` (objetivo 100% dorados verdes, no cobertura). fast-check propiedades Inv.1–3. PostgreSQL real en Neon dev para migraciones, `EXCLUDE`, RLS y triggers de cierre; el proyecto no usa Docker ni Testcontainers. Suite fuga multitenant obligatoria CI. Concurrencia 50–100 emisiones (0 duplicados/huecos). Corpus CSV adversarial. Excel celda a celda vs golden + snapshots PDF. Playwright E2E import→emitir→cerrar→descargar por rol. Reproducibilidad `sha256` idéntico.
- No se testea fidelidad pixel-perfect PDF (solo páginas clave), ni performance más allá sanity (año × 3 empresas en segundos, sin N+1).

## Hallazgos de auditorías

| Fecha | Hallazgo | Convención resultante |
|---|---|---|
| 2026-09-30 | Prisma vs Drizzle y PG 18 vs 16 en docs | Unificar a Drizzle + PG ≥16, ADR-012 |
| 2026-09-30 | Auditoría paso 06: TTL hardcodeado, sin logout UI, sin limpieza sesiones, sin rate limit en import | TTL por env + botón Salir + purga en login + límites 20/10 por min |

---
Ver también: `README.md`, `DOMAIN.md` (vocabulario), `DATABASE.md`, `API.md`, `SECURITY.md`, `TODO.md`, `CHANGELOG.md`.
