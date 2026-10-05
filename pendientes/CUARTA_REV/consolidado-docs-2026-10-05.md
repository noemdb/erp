# Consolidado docs/ — ERP-TributarioLite (CUARTA_REV)

> **Estado:** fotografía de trabajo, no sustituye la fuente de verdad (`docs/`).
> **Fecha:** 2026-10-05
> **Fuentes:** `docs/PROJECT.md`, `ARCHITECTURE.md`, `DOMAIN.md`, `DATABASE.md`, `API.md`,
> `SECURITY.md`, `CONVENTIONS.md`, `DECISIONS.md` (ADR-001–032), `TODO.md`, `CHANGELOG.md`,
> `docs/README.md`, `docs/anexos/pedido-F0-01.md`, `pendientes/TERCERA_REV/` (roadmap + enmienda +
> guía + `task/T01–T15`) (+ verificación directa del repo: git, escáner, intake).
> **Stack vigente:** Next.js 16 (build `--webpack`) + PostgreSQL ≥16 + Drizzle; **no usar Prisma ni Docker**.

---

## 1. Qué es y para quién (PROJECT.md)

Sin cambios respecto al consolidado 2026-10-02: sistema web multiempresa que registra compras,
ventas, pagos y retenciones **una sola vez** y deriva libros de IVA, resumen y comprobantes
IVA/ISLR en PDF/Excel, para empresas venezolanas en Excel + legacy + máquina fiscal.
Volumen: 100–200 docs/mes, 1–N empresas por despliegue.

- **Usuarios:** Administrativo (prepara), Contador (valida/configura/emite/cierra),
  Auditor (solo lectura), Admin sistema. Proveedor **sin login** en v1.
- **Propuesta de valor:** hecho → motor puro versionado (`rule_version_id` + `explanation[]`) →
  comprobante inmutable numerado sin huecos → libro/resumen reproducible + cierre con `closure_hash`.
- **Dentro de v1:** empresas/sucursales, terceros + RIF dual, compras/ventas/NC/ND/Z/pagos
  mínimos/parciales, retenciones recibidas G3 (registro + flujo registrada→conciliada→aplicada),
  CSV con staging, retenciones IVA/ISLR multi-factura, libros + resumen + conciliación + drill-down,
  cierre/reapertura, auditoría append-only, PDF/Excel.
- **Fuera de v1 (explícito):** factura electrónica, portal proveedores, correo, API realtime,
  contabilidad completa, nómina, inventario, OCR/IA.
- **Métricas M1–M6:** esqueleto provisional logrado; resto exige mes real = Excel, 0 huecos,
  cierre reproducible, paralelo = 0, firma contador.

---

## 2. Arquitectura (ARCHITECTURE.md)

**Principio rector:** el sistema registra hechos; libros, resúmenes y comprobantes son **salidas derivadas**.
Propiedades en orden: aislamiento multiempresa → inmutabilidad → reproducibilidad → trazabilidad.

| Capa | Tecnología (vigente) |
|---|---|
| Frontend | Next.js 16 App Router + React 19 + Tailwind 4 |
| Backend | Server Actions + Route Handlers (upload/download/health) |
| DB | PostgreSQL ≥ 16 (`numeric`, `daterange` + `EXCLUDE`, RLS) |
| ORM | Drizzle (+ SQL explícito; `numeric` como string) |
| Auth | **Sesiones DB propias (ADR-030)** — ARCHITECTURE.md aún dice "Auth.js o Better Auth", desactualizado |
| Jobs | `pg-boss` **diferido** (ADR-031); ejecutor `render:retry` + gatillos (>5000 filas / >10s / >5 pendientes) |
| Validación | Zod cliente + **servidor** (autoridad) |
| Dinero | `decimal.js`, jamás `number`/`float` |
| PDF | Chromium headless fijado major 154 (ADR-026; CI instala Chrome 154) |
| Excel | `exceljs` sobre plantilla original (tras formato aprobado) |
| Storage | UploadThing privado en prod / `fs` en dev (ADR-024) |
| Deploy | Sin Docker: Neon + procesos directos (ADR-015) |

**Módulos** (`src/modules/`, 18): `identity`, `tenancy`, `parties`, `fiscal-docs`, `sales`,
`payments`, `tax-engine` (puro), `imports`, `withholdings`, `rules`, `periods`, `deadlines`,
`received`, `reporting`, `audit`, `attachments`, `shared`. CONVENTIONS.md ya los lista (deuda cerrada).

**Reglas transversales:** `withTenant(ctx, fn)` + `authorize()` + RLS; DB solo en `modules/*/repo`;
motor `(company, counterparty, doc, asOf, rules)` → `{amounts, ruleVersionId, ruleSnapshot, explanation[]}`.

**Emisión (ADR-027 vigente):** lock → `UPDATE document_series … RETURNING` → snapshot + audit **en TX**;
render PDF **fuera** de la TX (`pending` + `render:retry`). ARCHITECTURE.md aún describe render
en la misma TX — desactualizado (task T14).

**Períodos:** `open → under_review → closed → reopened`; cierre con checklist + `closure_hash`;
post-cierre solo reapertura o `fiscal_adjustments` (diferida a F7 si se exige).

**Importación:** `source_files (bytes + sha256)` → `import_batches` → `import_rows` →
confirmación en TX. Divergencia importada vs recalculada: se **marca**. Mismo `sha256` no duplica.

---

## 3. Idioma ubicuo y reglas de negocio (DOMAIN.md)

Vinculante: `base_imponible` (no `subtotal`), `comprobante` (no `certificado`),
`alícuota` (no `tasa` en UI), retención ≠ descuento, NC/ND ≠ devolución física.
**Contrato E-2 (cerrado):** porcentajes como fracción string (`0.03` = 3 %),
base ISLR `base_gravable` (IVA conserva `base_imponible`), montos string 2 decimales,
fechas ISO, `round2` HALF_UP provisional hasta G8.

**Siete fechas:** `fecha_documento`, `fecha_recepcion`, `fecha_pago`, `fecha_abono_en_cuenta`,
`fecha_retencion` (pago o abono, lo que ocurra primero), `fecha_emision_comprobante`,
`fecha_entrega_comprobante`, `fecha_fiscal` (determina período). Registro nunca sustituye fiscal.

**Invariantes 1–9** (motor + property fast-check + constraints + fuga tenants): sin cambios.
**Tolerancia:** `0.01` provisional (DATABASE CHECK) hasta RDF G8; Inv.8 "tolerancia 0" es meta M5,
no norma actual (unificar en T06).

---

## 4. Base de datos (DATABASE.md)

PostgreSQL 16+, UUID, `numeric(18,2)` / `numeric(18,6)`, `date` fiscal + `timestamptz` UTC
(presentación `America/Caracas`). Sin soft delete. Migraciones `NNNN_*.sql` + `custom/`.

**Tablas por módulo:** `identity`, `tenancy`, `parties` (+ `party_tax_profiles` con EXCLUDE),
`periods` (+ trigger anti-mutación), `fiscal-docs` (compras/ventas líneas, máquinas, Z,
eventos liquidación + asignaciones), `imports` (staging), `withholdings` (reglas con EXCLUDE,
series, IVA/ISLR + líneas), `reporting` (+ versiones), `audit` (append-only),
`attachments`, `recovery`, `deadlines`, `received` (G3 + links).

**Campos G2:** `companies.abono_criterion` (`unset` fail-closed por defecto);
eventos `payment` / `account_credit` con asignación. IVA aún no consume eventos (T07).
**Reservados sin activar:** FX G4, tolerancia G8, serie ISLR G9, `electronically_issued` v2.
**E-3 pendiente (T14):** verificar si `origin` del seeder existe en schema o requiere migración.

**RLS:** activa en operativas; `app_runtime` existe, opt-in con `DB_LEAST_PRIVILEGE=true`
en staging/prod; dev sigue owner (T13).

---

## 5. API (API.md)

Sin API pública en v1. Server Actions + Handlers solo upload/download/health.
Códigos estables incl. `G2_EVENT_REVIEW_REQUIRED`, `GATE_NO_COVERAGE`/`GATE_FAILED`
(gate ACC-03: lo no sintético solo activa con ≥1 firmado 100% reproducido).
API.md aún redacta `pg-boss`/worker como capacidad — diferido por ADR-031 (T14).

**Acciones:** auth propio (login/logout/reset asistido), empresas/sucursales/perfil fiscal,
terceros+RIF dual, compras/ventas, eventos liquidación+asignación, import (validar/confirmar/
plantilla por kind), criterio abono (solo contador), preview/emitir/anular/reemitir IVA+ISLR,
reportes, períodos (incl. `createPeriod` manual), auditoría, adjuntos, health, `render:retry`.

---

## 6. Seguridad (SECURITY.md)

- **Secretos:** solo env; `.env.example` con placeholders. **Incidente `serverc` (ADR-029):**
  clave purgada del historial + remoto el 2026-10-05 (verificado: `git log --all -- serverc`
  vacío, sin `BEGIN OPENSSH PRIVATE KEY` en historial). `.gitignore` cubre `serverc*`.
  Escáner `secrets:scan` reactivado post-purge (fin ceguera ADR-032) + hook pre-commit instalado
  + CI lo corre. **Pendiente T12:** rotación en servidor (§1) y resto de secretos (§3).
- **Auth propio (ADR-030):** sesiones DB, Argon2id, recuperación solo asistida, rate limit.
- **RBAC rol×empresa:** solo contador emite/reglas/cierre; cuatro ojos según matriz por empresa (T01 P-2).
- **Inputs:** Zod servidor, dinero string, RIF dual, anti CSV-injection, magic bytes, HMAC+TTL.
- **Logs/PII:** pino con redacción; backups cifrados; retención fiscal 10 años.

---

## 7. Convenciones (CONVENTIONS.md)

`src/modules/*` por `index.ts`, tests junto al código, 17–18 módulos reales listados
(deuda cerrada DOC). TS strict + `noUncheckedIndexedAccess`, ESLint+boundaries+depcruise,
commits convencionales, `main` protegida. Motor sin DB/red/reloj; series con
`UPDATE…RETURNING`; import por staging idempotente. Testing: Vitest dorados, fast-check
Inv.1–3, Neon dev para EXCLUDE/RLS/triggers, fuga tenants, concurrencia 50–100,
Excel vs golden, **Playwright E2E (arnés 6/6 + P0 14/14 verde local, ACC-05/06)**,
reproducibilidad `sha256`.

---

## 8. Decisiones (DECISIONS.md) — ADR-001–032

Ratificadas 001/002/004/006/007/010/011/012, parciales 003/005, auth propio (030);
015/016/021/022/023/024/025/026/027/028/031 aceptadas; 008 diferida por 031;
013/014 bloqueadas (G4/G8); 017 aceptada estructural (cálculo bloqueado);
018/019/020 propuestas asesoría (bloqueadas); 029 aceptada (purge ejecutado 05-oct);
032 aceptada con efecto agotado (ceguera levantada post-purge).
Regla ADR: no se edita pasado; cambio de rumbo ⇒ ADR nuevo.

---

## 9. Estado de implementación (TODO.md al 2026-10-05)

F1–F6 + 1.0.4 + 2.0.2 mayormente implementadas; **gates fiscales y validación operativa pendientes**.
**F0-01 enviado 2026-10-05** (`docs/anexos/pedido-F0-01.md`: 18 + 5 + post-cierre + piloto/tiempos
+ M-1…M-4). Intake verificado (autodetect + golden-inspect operativos).

| Fase | Estado |
|---|---|
| F0 línea base | 🧪 pedido enviado; 🔲 matriz firmada, 🔲 30–50 dorados, 🔲 muestras (límite 16-oct), 🔲 Sesión 1 (23-oct) |
| F1 fundación | ✅ |
| F2 motor IVA | ✅ parcial; 🔲 dorados 100% + matriz (gate) |
| F3 importación | ✅ (cola diferida ADR-031) |
| F4 retenciones | ✅ parcial (IVA+ISLR emisión, ISLR PDF post-commit; falta UI edición contador) |
| F5 libros/resumen | ✅ parcial (comparador 2.A infra; 🔲 golden real + Excel fiel) |
| F8 controles | ✅ · F6 cierre | ✅ · F7 hardening | ✅ parcial (🔲 T12/T13) |
| 1.0.4 aceptación | ✅ infra + Playwright; 🔲 período real, dorados firmados |
| 2.0.2 Ola 1 | ✅ (adjuntos, recuperación) |

**Bloqueos activos:** G8, G4, G2 (criterio/porción/sustraendo; IVA no consume eventos),
G9 (formato/reinicio + cotejo reinicio IVA), cuatro ojos (matriz), dorados (17 candidatos;
ISLR-09 corregido base 900→306.00 a verificar), muestras, roles. H0: purge ✅, escáner ✅,
F0-01 ✅; resta T12 (rotación) + 73/73 + cierre formal.

---

## 10. Estado verificado en este workspace (2026-10-05)

- **Git:** `main` limpio; tras el purge, `git log --all -- serverc` vacío; 0 secretos trackeados;
  `secrets:scan` limpio (bloquea `serverc*` de nuevo); hook pre-commit activo (verificado en 2 commits).
  Commits desde 10-02: `6dba08a` (escáner), `93e2a48` (F0-01), `5b61f4b` (intake), `9d3b273` (tasks T01–T15).
- **Intake Muestras:** `import:autodetect` corre (compras-legacy 80% válido; Z sintéticas disparan
  gatillo 1 → FUN-05 esperará layouts reales); `golden:inspect` inventaría XLSX formatos (0 `#REF!`).
- **Tests:** cifra snapshot 73 al 2026-10-04 (convención DOC-04); TST-01 skip documentado 72/73
  (clave `app_runtime` del entorno, pendiente SEC-03).
- **Tasks:** `TERCERA_REV/task/T01–T15` + índice (copiadas a `CUARTA_REV/taskIN/`).
- **Cambios no commiteados ajenos:** `src/app/c/[companyId]/page.tsx`, `app-shell.tsx`,
  `company-drawer.tsx`, `company-nav.tsx` (aparecieron 05-oct; no incluidos en commits de esta sesión).

---

## 11. Deuda cerrada desde el consolidado 2026-10-02

1. ✅ Deuda §11.1–11.4 (fila F4 ISLR, CONVENTIONS módulos, orden ADR, cifras snapshot) — DOC-01…05.
2. ✅ ADR-008 → ADR-031 (pg-boss diferido, `render:retry`).
3. ✅ Playwright instalado: arnés 6/6 + P0 14/14 (ACC-05/06).
4. ✅ ISLR PDF post-commit + matriz-render (REP-01); Chrome 154 fijado (REP-02).
5. ✅ Gate activación ACC-03; firma golden ligada a sha256 (ACC-02).
6. ✅ Contrato motor E-2 (fracción + `base_gravable`); ISLR-09 corregido.
7. ✅ `serverc` purgado + escáner reactivado + F0-01 enviado + intake verificado (esta sesión).

**Deuda restante (→ tasks):** ARCHITECTURE/API desactualizados (T14), E-3 schema `origin` (T14),
tolerancia única (T06), deudas render menores (T09), T12/T13 hardening, T15 tablero.

---

## 12. Mapa de lectura

- Dev nuevo/IA: `PROJECT + ARCHITECTURE + TODO` mínimo (+`DOMAIN` motor, +`DATABASE` schema,
  +`API/SECURITY` endpoint sensible). Este consolidado es índice, no reemplazo.
- Contador: `PROJECT + DOMAIN` + `anexos/pedido-F0-01.md` (carátula del envío) + matriz + checklist.
- Auditor: `SECURITY + TODO + DECISIONS` (ADR-029–032 para el incidente).
- Tasks ejecutables: `CUARTA_REV/taskIN/T01–T15` + `00-INDICE.md`.
- Operación: 10 runbooks (incl. `incidente-serverc-2026-10-04.md` con §6 firmado parcial),
  3 manuales, UAT, `go-live-checklist.md`, `acta-aceptacion.md`.
