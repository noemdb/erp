# Consolidado docs/ — ERP-TributarioLite (TERCERA_REV)

> **Estado:** fotografía de trabajo, no sustituye la fuente de verdad (`docs/`).
> **Fecha:** 2026-10-02
> **Fuentes:** `docs/PROJECT.md`, `ARCHITECTURE.md`, `DOMAIN.md`, `DATABASE.md`, `API.md`,
> `SECURITY.md`, `CONVENTIONS.md`, `DECISIONS.md`, `TODO.md`, `CHANGELOG.md`, `docs/README.md`
> (+ verificación directa del repo: tests, migraciones, módulos, scripts).
> **Stack vigente:** Next.js 16 (build `--webpack`) + PostgreSQL ≥16 + Drizzle; **no usar Prisma ni Docker**.

---

## 1. Qué es y para quién (PROJECT.md)

Sistema web multiempresa que registra compras, ventas, pagos y retenciones **una sola vez** y deriva
libros de IVA, resumen y comprobantes IVA/ISLR en PDF/Excel, para empresas venezolanas que hoy operan
en Excel + software legacy + máquina fiscal. Volumen: 100–200 docs/mes, 1–N empresas por despliegue.

- **Usuarios:** Administrativo (importa/registra/prepara), Contador (valida/configura/emite/cierra),
  Auditor (traza, solo lectura), Admin sistema (usuarios/empresas/permisos). Proveedor **sin login** en v1.
- **Propuesta de valor:** hecho → motor puro versionado (`rule_version_id` + `explanation[]`) →
  comprobante inmutable numerado sin huecos → libro/resumen reproducible + cierre con `closure_hash`.
- **Dentro de v1:** empresas/sucursales opcionales, terceros + RIF dual, compras/ventas/NC/ND/Z/pagos
  mínimos/pagos parciales, retenciones recibidas (registro), CSV con staging, retenciones IVA/ISLR
  multi-factura, libros + resumen + conciliación + drill-down, cierre/reapertura controlada, auditoría
  append-only, PDF/Excel.
- **Fuera de v1 (explícito):** factura electrónica, portal proveedores, correo, API realtime
  legacy/Z/SENIAT, contabilidad completa, nómina, inventario, OCR/IA.
- **Métricas M1–M6:** esqueleto vertical (logrado provisional), mes real = Excel, 0 huecos en
  concurrencia, cierre reproducible, paralelo Excel vs sistema = 0, firma contador.

---

## 2. Arquitectura (ARCHITECTURE.md)

**Principio rector:** el sistema registra hechos; libros, resúmenes y comprobantes son **salidas derivadas**,
nunca fuentes. CSV/legacy/máquina fiscal son solo canales de entrada.

**Cuatro propiedades (orden de prioridad):** aislamiento multiempresa → inmutabilidad fiscal →
reproducibilidad → trazabilidad.

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 App Router + React 19 + Tailwind 4 |
| Backend | Server Actions (mutaciones UI) + Route Handlers (upload/download/health) |
| DB | PostgreSQL ≥ 16 (`numeric`, `daterange` + `EXCLUDE`, RLS) |
| ORM | Drizzle (+ SQL explícito; `numeric` como string) |
| Auth | Sesiones en DB (Auth.js o Better Auth — *elegir en F1*, sigue pendiente la elección formal) |
| Jobs | `pg-boss` (⚠️ ver §11: librería no instalada; env var existe pero no hay cola real) |
| Validación | Zod cliente + **servidor** (autoridad) |
| Dinero | `decimal.js`, jamás `number`/`float` |
| PDF | Chromium headless (`puppeteer-core`, ADR-026 cierra ADR-009) |
| Excel | `exceljs` sobre plantilla original |
| Storage | UploadThing privado en prod / `fs` en dev (ADR-024) |
| Deploy | Sin Docker: Neon + procesos directos (ADR-015) |

**Módulos** (`src/modules/`): `identity`, `tenancy`, `parties`, `fiscal-docs`, `sales`,
`payments`, `tax-engine` (puro, sin DB/red/reloj), `imports`, `withholdings`, `rules`,
`periods`, `deadlines`, `received`, `reporting`, `audit`, `attachments`, `shared`.
(⚠️ la lista documentada en CONVENTIONS.md no incluye `sales/payments/rules/deadlines/received`; ver §11.)

**Reglas transversales:** todo acceso DB por `withTenant(ctx, fn)` (`SET LOCAL app.company_id/user_id`)
+ `authorize()` + RLS; cliente DB solo en `modules/*/repo`; `tax-engine` recibe todo por parámetros
(`company, counterparty, doc, asOf, rules` → `{amounts, ruleVersionId, ruleSnapshot, explanation[]}`).

**Emisión de comprobantes (una sola TX):** lock operación → `UPDATE document_series … RETURNING`
(sin huecos, nunca `MAX()+1`) → snapshot + `rule_version_id` → estado `issued` + audit en TX.
Render PDF **fuera** de la TX (ADR-027): se guarda HTML inmutable, `renderIvaPdf` idempotente post-commit
con reintentos y tablero `listPendingRenders`. Un comprobante emitido nunca se edita
(anula sin liberar número / sustituye con `replaces_id`).

**Períodos:** `open → under_review → closed → reopened`; cierre con checklist + `closure_hash`
(ids + versiones); post-cierre solo reapertura autorizada o `fiscal_adjustments`.

**Importación (staging):**
`source_files (bytes + sha256)` → `import_batches` → `import_rows (raw JSONB + normalizado + errores)` →
validación → confirmación en TX atómica. Diferencia retención importada vs recalculada: se **marca**,
nunca se sobrescribe. Re-subida mismo `sha256` no duplica.

---

## 3. Idioma ubicuo y reglas de negocio (DOMAIN.md)

Vinculante: `base_imponible` (no `subtotal`), `comprobante` (no `certificado`),
`alícuota` (no `tasa` en UI), retención ≠ descuento comercial, NC/ND ≠ devolución física.

**Siete fechas distintas (crítico):** `fecha_documento`, `fecha_recepcion`, `fecha_pago`,
`fecha_abono_en_cuenta`, `fecha_retencion` (pago o abono, lo que ocurra primero),
`fecha_emision_comprobante`, `fecha_entrega_comprobante`, `fecha_fiscal` (determina el período).
**Regla de oro:** la fecha de registro nunca sustituye a la fecha fiscal.

**Invariantes → tests:**

| # | Invariante | Cobertura |
|---|---|---|
| 1 | `base + iva + conceptos = total` (tolerancia ADR-014) | motor + property |
| 2 | `iva_retenido ≤ iva_causado` | unitario + property |
| 3 | NC ≤ saldo del documento afectado | unitario + integración DB |
| 4 | Comprobante emitido inmutable | constraint + endpoint |
| 5 | Numeración sin huecos bajo concurrencia | 50–100 workers paralelos |
| 6 | Período cerrado inmutable | trigger + endpoint |
| 7 | Todo cálculo referencia `rule_version_id` | unitario + schema |
| 8 | Resumen = suma de documentos (tolerancia 0) | integración + regresión |
| 9 | Ninguna consulta cruza `company_id` sin `withTenant` | lint + fuga en CI |

**Casos límite con tratamiento definido:** documento de período anterior (conserva `fecha_fiscal`),
NC que excede saldo (se rechaza), Z con salto de numeración (advertencia, no bloquea),
retención importada divergente (se marca), ISLR con sustraendo > base×% → 0 (no negativo),
doble emisión concurrente (lock de serie), edición en cerrado (rechazo app + DB).

---

## 4. Base de datos (DATABASE.md)

PostgreSQL 16+, UUID internos, `numeric(18,2)` dinero / `numeric(18,6)` tasas, fechas fiscales `date`,
instantes `timestamptz` UTC (negocio `America/Caracas` solo en presentación). Sin soft delete
(`status` + `voided_at`). Migraciones Drizzle Kit `NNNN_*.sql` + `custom/` (EXCLUDE, RLS, triggers, REVOKE).

**Tablas por módulo:** `identity` (users, company_user), `tenancy` (companies, branches),
`parties` (parties, party_tax_profiles con `EXCLUDE` de vigencia, withholding_concepts),
`periods` (fiscal_periods + trigger anti-mutación en cerrado), `fiscal-docs`
(purchase_documents + lines, sales_documents + lines, fiscal_machines, z_reports,
payments/eventos de liquidación + payment_allocations), `imports`
(source_files, import_batches, import_rows), `withholdings` (withholding_rules con `EXCLUDE`
de no-solapamiento, document_series, iva/islr_withholdings + lines),
`reporting` (generated_reports + report_versions), `audit` (audit_events, `REVOKE UPDATE,DELETE`),
`attachments`, `recovery` (password_reset_tokens), `deadlines` (fiscal_obligations, fiscal_holidays),
`received` (withholdings_received + received_links).

**Campos G2:** `companies.abono_criterion` (`unset` default fail-closed / `payment_only` /
`account_credit_or_payment`); eventos `payment` / `account_credit` con asignación verificable.
**Campos reservados sin activar:** `currency/fx_rate/fx_rate_date` (G4), tolerancia de `CHECK`
provisional (G8), formato serie ISLR (G9), `electronically_issued` (v2).

**Migraciones aplicadas:** `0000`–`0022` (esquema F1–F6, G2 0011/0012, workflow reglas 0014/0015,
modo Z 0016, plazos 0017, render/adjuntos, branding 0020, RLS total 0022).

**RLS:** activa en todas las operativas; rol app sin owner ni `BYPASSRLS` (defensa documentada;
el rol mínimo `app_runtime` existe y se activa con `DB_LEAST_PRIVILEGE=true` en staging/prod).

---

## 5. API (API.md)

Sin API pública en v1. Server Actions tipadas para mutaciones; Route Handlers solo para
`POST /api/companies/[companyId]/imports/upload`, descargas (`reports/*`, `rejected.csv`,
`archivos/[id]` con HMAC+TTL ≤15 min) y `GET /api/health`.

**Error estándar:** `{ error: { code, message, details? } }` con códigos estables:
`UNAUTHENTICATED/FORBIDDEN/NOT_FOUND`, `VALIDATION_ERROR`, `PERIOD_CLOSED`, `PERIOD_NOT_OPEN`,
`DUPLICATE_DOCUMENT`, `CREDIT_NOTE_EXCEEDS_BALANCE`, `RETENTION_EXCEEDS_VAT`,
`G2_EVENT_REVIEW_REQUIRED`, `TOTAL_MISMATCH`, `MISSING_AFFECTED_DOCUMENT`,
`SERIES_EXHAUSTED/SERIES_NOT_FOUND`, `INVALID_STATE_TRANSITION`, `IMPORT_HAS_ERRORS`,
`REPORT_NOT_REPRODUCIBLE`, `RATE_LIMITED`.

**Acciones principales por módulo:** `login/logout`, `issueResetLink/consumeResetLink` (asistido, TTL 60 min),
`createCompany/updateCompanyFiscalProfile/createBranch`, `upsertParty/setPartyTaxProfile`,
`createPurchaseDocument/voidPurchaseDocument`, `createSalesDocument`, `createSettlementEvent/allocateSettlementEvent`,
`applyMappingProfile/validateBatch/confirmImport`, `configureAbonoCriterionAction` (solo contador, con motivo),
`previewIslrAction` (dual sin emitir), `previewWithholding/issueWithholding/voidWithholding/reissueWithholding/listWithholdings`,
reportes (`purchase-book/sales-book/iva-summary/iva-withholdings/islr-withholdings/conciliation`),
`sendPeriodToReview/closePeriod/requestReopen/approveReopen`,
`listAuditEvents`, `uploadAttachment`, health.

**Regla G2 en API:** con `unset`, solo emite evento `payment` si ambos escenarios convergen
(fecha, período, regla, base, importe/moneda, asignaciones); lo demás bloquea con
`G2_EVENT_REVIEW_REQUIRED` antes de reservar número. Con criterio explícito, la emisión sigue ese
criterio con asignación verificable. La comparación no atribuye base por porción ni resuelve sustraendo.

---

## 6. Seguridad (SECURITY.md)

- **Secretos:** solo env (`.env` fuera del repo, `.env.example` sin valores); rotación en runbooks.
- **Auth:** sesiones DB, cookie `HttpOnly`+`Secure`+`SameSite=Lax`; Argon2id; recuperación **solo asistida
  por admin** (ADR-025, token ≥256 bits, un solo uso, TTL 60 min, invalida sesiones); MFA recomendado
  Contador/Admin; rate limit estricto en login/reset/emisión.
- **RBAC rol×empresa** (`authorize()` + RLS): solo admin gestiona usuarios/empresas; administrativo y
  contador crean documentos e importan; **solo contador** edita reglas, configura G2, emite/anula y
  cierra/reabre (con motivo); auditor solo lectura. Administrativo emitiendo: pendiente de decisión (defecto: no).
- **Inputs:** Zod en servidor; dinero string; RIF dual; neutralización CSV-injection (`=+-@`);
  upload por magic bytes, fuera de webroot, `MAX_UPLOAD_MB`; descarga con firma HMAC corta vida.
- **Logs/PII:** pino + Sentry sin RIF/direcciones/tokens/hashes; backups `pg_dump` + WAL cifrados fuera
  del servidor; restore drill documentado. Retención fiscal 10 años; audit indefinido.
- **Amenazas:** fuga tenants (baja/crítica), huecos numeración, reglas mal interpretadas,
  pérdida datos/conectividad VE, CSV adversarial, abuso auth/emisión — cada una con mitigación.

---

## 7. Convenciones (CONVENTIONS.md)

Estructura `src/modules/*` (comunica por `index.ts`), `app/(auth)` + `app/(app)/[companyId]`,
`drizzle/schema+migrations`, `fixtures/` (tax-scenarios, csv-corpus, golden-master),
tests junto al código. TS strict + `noUncheckedIndexedAccess`, Prettier + ESLint +
`eslint-plugin-boundaries` + `dependency-cruiser` en CI. Dinero string + `decimal.js`;
fechas `date` vs `timestamptz`; `asOf` explícito sin `Date.now()` en motor; RIF dual.
Commits convencionales, `main` protegida, PR pequeño por bloque.
Testing: Vitest + dorados (objetivo 100%), fast-check Inv.1–3, Neon dev para EXCLUDE/RLS/triggers
(sin Docker ni Testcontainers), fuga multitenant en CI, concurrencia 50–100, Excel celda a celda
vs golden, Playwright E2E (pendiente), reproducibilidad `sha256`.

---

## 8. Decisiones (DECISIONS.md) — tabla ADR

| ADR | Tema | Estado |
|---|---|---|
| 001 | Monolito modular Next.js | Propuesta |
| 002 | Multitenancy esquema compartido + RLS | Propuesta |
| 003 | Dinero `numeric` + `decimal.js` | Propuesta (tolerancia → 014) |
| 004 | Reglas como datos con vigencia + semántica en código | Propuesta |
| 005 | Numeración sin huecos transaccional | Propuesta (ISLR → G9) |
| 006 | Inmutabilidad fiscal | Propuesta |
| 007 | Importación en staging | Propuesta |
| 008 | Jobs `pg-boss` sin Redis | Propuesta (⚠️ no instalada; ver §11) |
| 009 | PDF HTML→Chromium / Excel sobre plantilla | Propuesta → **cerrada por 026** |
| 010 | Auth sesiones DB + rol×empresa | Propuesta |
| 011 | Auditoría append-only en misma TX | Propuesta |
| 012 | ORM Drizzle (unifica Prisma→Drizzle) | Propuesta |
| 013 | Moneda/FX | **Bloqueada G4** |
| 014 | Redondeo | **Bloqueada G8** |
| 015 | Sin Docker (Neon + procesos directos) | **Aceptada** |
| 016 | Iconos `@mui/icons-material` única | **Aceptada** |
| 017 | Captura eventos liquidación G2 (estructural) | **Aceptada** (cálculo bloqueado) |
| 018 | Series de comprobantes configurables | Propuesta asesoría (bloqueada) |
| 019 | Catálogo ISLR por beneficiario/vigencia | Propuesta asesoría (bloqueada) |
| 020 | Segregación de funciones (cuatro ojos) | Propuesta asesoría (bloqueada) |
| 021 | Criterio G2 configurable fail-closed + convergencia | **Aceptada** (control técnico, no aprobación fiscal) |
| 022 | Workflow reglas borrador→activo | **Aceptada** |
| 023 | Rol runtime `app_runtime` opt-in | **Aceptada** |
| 024 | Storage UploadThing privado (fs en dev) | **Aceptada** |
| 025 | Recuperación solo asistida por admin | **Aceptada** |
| 026 | PDF Chromium headless (cierra 009) | **Aceptada** |
| 027 | Render fuera de la TX de emisión | **Aceptada** |
| 028 | Gráficos ApexCharts | **Aceptada** |

Regla ADR: no se edita ni borra; el cambio crea una entrada nueva.

---

## 9. Estado de implementación (TODO.md)

F1–F6 implementadas parcial o mayormente; **gates fiscales y validación operativa pendientes**.
F0 abierta (sin matriz firmada + dorados no se cierra F2).

| Fase | Estado |
|---|---|
| F0 línea base fiscal | 🔲 matriz firmada, 🔲 30–50 dorados, 🔲 muestras reales, 🧪 G1–G12 parcial |
| F1 fundación + esqueleto | ✅ (tooling, env+DB, withTenant+RLS+fuga, sesiones, audit, compra→libro provisional) |
| F2 núcleo fiscal/motor | ✅ parcial (engine+dorado inicial+properties, terceros, períodos, ventas/pagos, G2 captura+criterio; 🔲 dorados 100% + matriz) |
| F3 importación CSV | ✅ (staging idempotente, parser+validación+preview, confirmación+Z+async diferido) |
| F4 retenciones | ✅ parcial (reglas+series, emisión IVA, ISLR básico, entrega; falta UI edición contador, PDF fiel → F5) |
| F5 libros/resumen | ✅ parcial (resumen+conciliación+drill-down+versionado, comparador 2.A infra; 🔲 regresión vs golden + PDF fiel) |
| F8 controles auto | ✅ (7 controles + UI) |
| F6 cierre/auditoría | ✅ (checklist, `closure_hash`, bloqueo doble capa, reapertura, vista auditor) |
| F7 hardening/operación | ✅ parcial (health, logs, runbooks, rol mínimo, UAT/manuales/acta; 🔲 migración histórica, paralelo Excel, go-live) |
| 1.0.4 aceptación técnica | ✅ infra (golden/properties/fuga/concurrencia/E2E servicios/reporte); 🔲 período real, Playwright, dorados firmados |
| 2.0.2 Ola 1 | ✅ (adjuntos firmados, recuperación asistida) |

**Novedades 2026-10-02 (verificadas en repo):** branding por empresa (logo + color distintivo,
migración 0020); compras manual completa con multilínea + preview Inv.1 en vivo (skill beautiful-ui);
catálogo de proveedores con modal buscador. **En curso sin commitear:** UI de períodos
(páginas + botones + revalidación tras acciones).

**Bloqueos activos:** G8 redondeo (método/etapa/precisión), G4 FX (fecha/tipo tasa BCV, diferencias),
G2 abono (asiento, base por porción, sustraendo parcial; IVA no consume eventos), G9 ISLR
(formato/reinicio; posible desajuste reinicio IVA por cotejar), cuatro ojos (matriz usuarios),
golden candidates (17 sin firma; ISLR-09 con inconsistencia de base), muestras reales (XLSX sin validar,
CSV/Z sin confirmar), roles (matriz por empresa).

---

## 10. Estado verificado en este workspace (2026-10-02)

Medido directamente, no copiado de docs:

- **Tests:** 46 archivos / 73 tests → **67 verdes, 5 fallan, 1 omitido**.
  Los 5 fallos son `pdf-spike.test.ts` + `render-job.test.ts`: requieren Chromium en
  `/usr/bin/google-chrome`, ausente en este host (ADR-026: baselines solo válidos en su host).
- **typecheck:** verde. **lint:** 0 errores, 5 warnings (solo `<img>` vs `next/image` y similares).
- **Migraciones:** 23 archivos (`0000`–`0022`). **Scripts:** 20 en `package.json`
  (`goldens:check`, `golden:inspect/compare`, `g8:calibrate`, `g2:divergence`, `catalog:*`,
  `import:autodetect`, `migration:report`, `series:reconcile`, `acceptance:evidence`, …).
- **Módulos:** 18 en `src/modules/`. **Fixtures:** 1 dorado ejecutable (IVA-01) + manifest,
  corpus CSV (legacy + Z normal + Z adversarial), baselines PDF, catalog-pack sintético.
- **Ausencias confirmadas:** Playwright no instalado; `pg-boss` no instalado (sin cola real);
  `fiscal_adjustments` diferida; `electronically_issued` reservado.

---

## 11. Deuda documental y de consistencia detectada (no bloqueante)

1. `TODO.md` F4 conserva “Falta ISLR” en la fila de emisión aunque la fila siguiente y el CHANGELOG
   registran ISLR implementado (pendiente solo lo fiscal). Corregir la fila.
2. ADR-008 documenta `pg-boss`, pero la librería no está instalada ni hay worker/cola:
   imports grandes y render pesado no tienen async real. Decidir: implementar o ADR que lo difiera.
3. `CONVENTIONS.md` §estructura no lista `sales`, `payments`, `rules`, `deadlines`, `received`
   (existen en `src/modules/`) y habla de `tests/` raíz cuando los tests viven junto al código.
4. `DECISIONS.md` no está en orden numérico (026/027 antes de 024/025). Solo orden.
5. `.env`: `DATABASE_URL` con `&` sin comillas → `source .env` en bash la trunca en silencio;
   usar loader dotenv o entrecomillar. (No commitear valores reales.)
6. `serverc` / `serverc.pub` (clave privada SSH) en la raíz del repo, **sin entrada en `.gitignore`**
   y sin trackear: rotar/eliminar según runbook `rotacion-secretos.md`. Prioritario.
7. Cifras de tests en CHANGELOG (“49 tests”, “67 tests”) desactualizadas frente a 73 actuales;
   fijar como snapshot con fecha en futuras entradas.

---

## 12. Mapa de lectura

- Dev nuevo/IA: `PROJECT + ARCHITECTURE + TODO` mínimo; +`DOMAIN` si motor, +`DATABASE` si schema,
  +`API/SECURITY` si endpoint sensible. Este consolidado sirve como índice, no como reemplazo.
- Contador: `PROJECT + DOMAIN` (glosario/7 fechas) + `anexos/matriz-reglas-v1` + `anexos/checklist-F0`.
- Auditor: `SECURITY + TODO + DECISIONS`.
- Diagramas Mermaid en `ARCHITECTURE.md` (componentes/flujo) y `DATABASE.md` (ERD).
- Anexos F0: `paquete-contador.md`, `matriz-reglas-v1.md` (+ `.generada.md`), `escenarios-dorados.md`,
  `checklist-F0.md`, `decision-abonos-G2-contador.md`, `bitacora-diferencias.md`, plantillas RDF/diferimiento/roles.
- Operación: 8 runbooks, 3 manuales, 3 guiones UAT, `go-live-checklist.md`, `acta-aceptacion.md`.
