# Pendientes de implementación — ERP-TributarioLite (TERCERA_REV)

> **Estado:** resumen de trabajo, no sustituye la fuente de verdad.
> **Fecha:** 2026-10-02
> **Fuentes:** `docs/TODO.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md` (ADR-001–028),
> `pendientes/TERCERA_REV/consolidado-docs-2026-10-02.md` y verificación directa del repo.
> **Stack vigente:** Next.js 16 (build `--webpack`) + PostgreSQL + Drizzle; no usar Prisma ni Docker.

Desde la SEGUNDA_REV se sumó: branding por empresa (migración 0020), compras manual completa con
multilínea + preview Inv.1 en vivo, catálogo de proveedores con modal buscador, ledger de emisiones +
`series:reconcile`, comparador 2.A contra golden real (infra) y las evidencias 2.0.3.
**Estado medido hoy:** 46 archivos / 73 tests → 67 verdes, 5 fallan (Chromium ausente en este host),
1 omitido; typecheck verde; lint 0 errores / 5 warnings.
Lo pendiente sigue siendo casi todo **decisión fiscal del contador, muestras reales o
infraestructura de producción**; el código no debe adelantarlas.

## 1. F0 — Cierre de línea base fiscal (bloqueante, en cancha del contador)

### Aprobaciones y entregables

- [ ] Firmar la Matriz de Reglas v1 (el mecanismo de versionado ya existe: ADR-022).
- [ ] Firmar 30–50 escenarios dorados (formato `fixtures/tax-scenarios/`, manifest sin omitidos;
  los 17 candidatos siguen sin firma y fuera de fixtures; ISLR-09 con inconsistencia de base por corregir).
- [ ] Validar el XLSX como golden master; entregar mes CSV legacy + archivos Z reales anonimizados.
- [ ] Responder G1/G2/G4/G7/G8/G9/G11/G12 y matriz de roles (ver `docs/anexos/paquete-contador.md`).

### Decisiones aún abiertas

- [ ] **G2:** base atribuible por porción, sustraendo parcial, consumo de eventos por IVA, anticipos
  (infraestructura y comparación dual listas; cálculo bloqueado; IVA aún no consume eventos).
- [ ] **G4:** fecha/tipo de tasa BCV y diferencias cambiarias.
- [ ] **G8:** método y etapa de las “8 cifras decimales significativas”.
- [ ] **G9:** formato y reinicio ISLR (+ cotejo reinicio IVA, ADR-018).
- [ ] **Roles:** matriz por empresa; cuatro ojos solo si hay usuarios suficientes (ADR-020).
- [ ] **Ajustes post-cierre:** ¿reapertura suficiente o `fiscal_adjustments`? Preguntar al contador antes de modelar.

## 2. Funcionalidad pendiente (condicionada)

- [ ] **UI períodos en curso:** páginas/botones/revalidación modificados sin commitear; terminar, probar y commitear.
- [ ] **Catálogos:** cargar valores reales solo con matriz firmada (el workflow borrador→activo ya funciona).
- [ ] **Modo Z:** validar con mes real por sucursal (estructura lista + control de convivencia).
- [ ] **Plazos:** norma/artículo/vigencia por tipo + caso real (tablas y tablero listos, sin valores por defecto).
- [ ] **G3:** caso real anonimizado + validación del tratamiento y del no-neteo en resumen.
- [ ] **Cola real o ADR de diferimiento:** ADR-008 documenta `pg-boss` pero la librería no está instalada;
  imports grandes y renders pesados no tienen async real (el render corre por acción post-commit).
- [ ] **Perfiles de importación:** solo si formatos reales lo exigen (autodetección actual cubre el caso típico).

## 3. Reportes y comprobantes

- [ ] Instalar Chromium en el host de CI/dev dedicado (o fijar `CHROME_PATH` válido) para que los
  5 tests de `pdf-spike`/`render-job` corran; re-aprobar baselines en ese host (ADR-026).
- [ ] Comparación celda a celda contra golden real (comparador con clasificación listo, probado con fixtures).
- [ ] Período real M2/M5 con diferencias clasificadas y aprobadas.

## 4. Pruebas de aceptación

- [ ] Dorados firmados 100% verdes (infraestructura: manifest, garantías, `acceptance:evidence`;
  hoy 67/73 técnicos verdes, resto bloqueado por Chromium).
- [ ] Playwright E2E por rol con navegadores (existe E2E por servicios; Playwright ni instalado).
- [ ] Piloto 1–3 empresas y paralelo Excel vs sistema.

## 5. F7 — Operación y go-live

- [ ] **Prioritario:** `serverc` / `serverc.pub` (clave privada SSH) en la raíz del repo, sin `.gitignore`
  ni trackeo: rotar/eliminar según runbook `rotacion-secretos.md`.
- [ ] Entrecomillar `DATABASE_URL` en `.env` (el `&` sin comillas trunca el valor con `source` en bash).
- [ ] Activar `DB_LEAST_PRIVILEGE=true` en staging/prod (rol verificado; dev sigue con owner hasta migrar
  seeds de pruebas a contexto explícito).
- [ ] Migrar seeds de pruebas a `withTenant` para que dev también corra con el rol mínimo.
- [ ] Restore drill real con RPO/RTO medidos y registrados.
- [ ] UAT por rol, capacitación, firmas (`docs/uat`, `docs/manuales`, `docs/acta-aceptacion.md` listos como guiones).

## 6. Deuda documental (no bloqueante, esfuerzo pequeño)

- [ ] `TODO.md` F4: la fila de emisión conserva “Falta ISLR” aunque ISLR está implementado
  (señalado desde PRIMERA_REV); corregir la fila.
- [ ] `CONVENTIONS.md`: actualizar lista de módulos (`sales`, `payments`, `rules`, `deadlines`,
  `received`) y ubicación real de los tests (junto al código, no `tests/` raíz).
- [ ] `DECISIONS.md`: reordenar numéricamente (026/027 aparecen antes de 024/025).
- [ ] CHANGELOG: fijar cifras de tests como snapshot con fecha (las menciones “49/67 tests” ya van por 73).

## Ya implementado en esta revisión (pendiente solo de validación externa)

- Branding por empresa (logo + color distintivo) + hero del panel.
- Compras manual completa con multilínea y preview Inv.1 en vivo; catálogo de proveedores con buscador.
- Ledger de emisiones + `reconcileSeries` + `series:reconcile` con runbook de restore.
- Comparador 2.A contra golden real (infra) + bitácora D1–D5; evidencias 2.0.3 (HTML versionado,
  comparador Excel ESTRUCTURA/VALOR/FORMATO).
- Render IVA fuera de la TX (ADR-027) con reintentos y tablero de pendientes.
- Todo lo ya listado en SEGUNDA_REV (G3, workflow de reglas, modo Z, plazos, F8, aceptación técnica,
  `app_runtime`, adjuntos firmados, recuperación asistida).

## Orden recomendado

1. Seguridad inmediata: clave `serverc` + `.env` entrecomillado.
2. Cerrar decisiones F0 y conseguir muestras reales.
3. Cargar matriz/dorados y ejecutar lo que cambie del cálculo.
4. Validar reportes e importaciones con período real + golden (+ Chromium en CI).
5. Completar hardening (rol activo, restore drill), UAT y firmas.
