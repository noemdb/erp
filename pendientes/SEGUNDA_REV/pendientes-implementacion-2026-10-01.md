# Pendientes de implementación — ERP-TributarioLite (SEGUNDA_REV)

> **Estado:** resumen de trabajo, no sustituye la fuente de verdad.
> **Fecha:** 2026-10-01
> **Fuentes:** `docs/TODO.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md` (ADR-022/023) y roadmaps `pendientes/PRIMERA_REV/roadMap/1.0.1.md`–`1.0.5.md`.
> **Stack vigente:** Next.js (build `--webpack`) + PostgreSQL + Drizzle; no usar Prisma ni Docker.

Desde la PRIMERA_REV se implementaron los roadmaps 1.0.1 (F8), 1.0.2 (G3, catálogos, G7, plazos), 1.0.3 (evidencias a–b), 1.0.4 (aceptación técnica) y 1.0.5 (operación): 49 tests en 33 archivos verdes + build verde. Lo pendiente es casi todo **decisión fiscal del contador, muestras reales o infraestructura de producción**; el código no debe adelantarlas.

## 1. F0 — Cierre de línea base fiscal (bloqueante, en cancha del contador)

### Aprobaciones y entregables

- [ ] Firmar la Matriz de Reglas v1 (el mecanismo de versionado ya existe: ADR-022).
- [ ] Firmar 30–50 escenarios dorados (formato `fixtures/tax-scenarios/`, manifest sin omitidos; candidatos sin firma siguen fuera).
- [ ] Validar el XLSX como golden master; entregar mes CSV legacy + archivos Z reales anonimizados.
- [ ] Responder G1/G2/G4/G7/G8/G9/G11/G12 y matriz de roles (ver `docs/anexos/paquete-contador.md`).

### Decisiones aún abiertas

- [ ] **G2:** base atribuible por porción, sustraendo parcial, consumo de eventos, anticipos (infraestructura lista, cálculo bloqueado).
- [ ] **G4:** fecha/tipo de tasa BCV y diferencias cambiarias.
- [ ] **G8:** método y etapa de las “8 cifras decimales significativas”.
- [ ] **G9:** formato y reinicio ISLR (+ cotejo reinicio IVA, ADR-018).
- [ ] **Roles:** matriz por empresa; cuatro ojos solo si hay usuarios suficientes (ADR-020).
- [ ] **Ajustes post-cierre:** ¿reapertura suficiente o `fiscal_adjustments`? Preguntar al contador antes de modelar.

## 2. Funcionalidad pendiente (condicionada)

- [ ] **Catálogos:** cargar valores reales solo con matriz firmada (el workflow borrador→activo ya funciona).
- [ ] **Modo Z:** validar con mes real por sucursal (estructura lista + control de convivencia).
- [ ] **Plazos:** norma/artículo/vigencia por tipo + caso real (tablas y tablero listos, sin valores por defecto).
- [ ] **G3:** caso real anonimizado + validación del tratamiento y del no-neteo en resumen.
- [ ] **Perfiles de importación:** solo si formatos reales lo exigen (autodetección actual cubre el caso típico).
- [ ] **Recuperación de contraseña:** falta el flujo completo (requiere SMTP o canal de entrega definido).
- [ ] **Adjuntos con URL firmada:** módulo pendiente (hoy solo `source_files` en DB).

## 3. Reportes y comprobantes

- [ ] Spike PDF con Chromium + snapshots visuales (HTML versionado ya es la fuente; falta el render).
- [ ] Comparación celda a celda contra golden real (comparador con clasificación listo, probado con fixtures).
- [ ] Período real M2/M5 con diferencias clasificadas y aprobadas.

## 4. Pruebas de aceptación

- [ ] Dorados firmados 100% verdes (infraestructura: manifest, garantías, `acceptance:evidence` con 48/48 técnicos).
- [ ] Playwright E2E por rol con navegadores (existe E2E por servicios).
- [ ] Piloto 1–3 empresas y paralelo Excel vs sistema.

## 5. F7 — Operación y go-live

- [ ] Activar `DB_LEAST_PRIVILEGE=true` en staging/prod (rol verificado; dev sigue con owner hasta migrar seeds de pruebas a contexto explícito).
- [ ] Migrar seeds de pruebas a `withTenant` para que dev también corra con el rol mínimo.
- [ ] Restore drill real con RPO/RTO medidos y registrados.
- [ ] Rotar secretos detectados en el workspace (runbook listo).
- [ ] UAT por rol, capacitación, firmas (`docs/uat`, `docs/manuales`, `docs/acta-aceptacion.md` listos como guiones).

## Ya implementado en esta revisión (pendiente solo de validación externa)

- G3 circuito registrada→conciliada→aplicada + línea en resumen sin neteo.
- Workflow de reglas con cierre de vigencia (ADR-022) + UI + historial.
- Modo Z por empresa, máquina→sucursal, control de convivencia F8.
- Obligaciones de plazo configurables + tablero (sin valores por defecto).
- 7 controles F8 + manifest golden + garantías motor + matriz de fuga + 50 reservas / 20 emisiones + mismo-documento + E2E servicios + evidencia (`acceptance/`).
- Rol `app_runtime` + prueba negativa + `migration:report` + headers + manuales/UAT/runbooks/checklist/acta.
- Fix login (`__Host-` + Secure) y tooling (PostCSS string + Vitest inline, build `--webpack`).

## Orden recomendado

1. Cerrar decisiones F0 y conseguir muestras reales.
2. Cargar matriz/dorados y ejecutar lo que cambie del cálculo.
3. Validar reportes e importaciones con período real + golden.
4. Completar hardening (rol activo, restore drill, secretos), UAT y firmas.
