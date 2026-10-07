# Consolidado docs/ — ERP-TributarioLite (QUINTA_REV)

> **Estado:** fotografía de trabajo al 2026-10-07, no sustituye la fuente de verdad (`docs/`).
> **Fecha:** 2026-10-07
> **Fuentes:** `docs/` (PROJECT, ARCHITECTURE, DOMAIN, DATABASE, API, SECURITY, CONVENTIONS,
> DECISIONS ADR-001–034, TODO, CHANGELOG, README, anexos) + `pendientes/CUARTA_REV/`
> (roadmapRev4, consolidado 10-05, siguientes-pasos-sesion-6-pasos, decisiones/, diff/, taskIN/)
> + **verificación directa del repo**: git, schema Drizzle, migraciones 0000–0023,
> `acceptance:gate --profile=golive`, tests, mermaid de ARCHITECTURE, `DATABASE.md` vs snapshot.
> **Stack vigente:** Next.js 16 (build `--webpack`) + PostgreSQL ≥16 + Drizzle; sin Prisma, sin Docker.
> **Precedente:** esta revisión recoge lo que `CUARTA_REV` dejó abierto y corrige el estado que
> quedó viejo entre 2026-10-05 y 2026-10-07.

---

## 1. Qué cambió desde el consolidado de CUARTA_REV (10-05 → 10-07)

| Fecha | Cambio | Efecto en el estado |
|---|---|---|
| 10-05 | Purge `serverc` + escáner reactivado + F0-01 enviado + intake verificado | H0 cerrado |
| 10-05 | `voidPurchaseDocument` + corrección de datos dev (NC 001-00004) | Anulación operativa; **deuda abierta**: signo NC en agregados (ADR-033) |
| 10-06 | Simulación #2 rerun (lote `9740a7bd`, 10 docs) | Camino feliz probado en el sistema real; **0 RDF firmados** |
| 10-06 | Caso práctico en `/docs` (4 páginas) | Documentación de usuario lista |
| 10-06 | **RDF implementado** (ADR-034 aceptada): migración 0023, módulo `rdf`, UI `/decisiones`, gate `GATE_NO_RDF` | La infra de decisión fiscal existe; falta **usarla y firmarla** |
| 10-06/07 | Manual por rol (`/manual`) + gestión de usuarios en dropdown | UAT de roles con material |
| 10-06/07 | 3 commits `wip` sin etiqueta descriptiva | Deuda de higiene de git |

**El cambio de fondo:** la cuarta revisión|goalsó convertir la sesión en *infra* (RDF en sistema).
La quinta revisión debe convertirla en *decisión firmada*. Todo lo demás ya está.

---

## 2. Estado real verificado (2026-10-07)

### 2.1 Código

- **52 archivos de test** en `src/` (56 con `e2e/` + `scripts/`), 18 módulos.
- **Migraciones 0000–0023**, journal consistente. 0023 = RDF.
- `tax-engine` puro, sin DB/red/reloj. `round2` HALF_UP provisional (G8 abierto).
- Schema verificado contra `docs/DATABASE.md`: **6 tablas documentadas con columnas que no existen en el físico** (ver §5).
- Módulos con más cobertura: `withholdings` (9), `reporting` (5), `tax-engine` (4), `imports` (4).

### 2.2 Gate de aceptación (ejecutado hoy)

`npm run acceptance:gate --profile=golive` → **NO-GO**.

| Sección | Denominador | Estado |
|---|---|---|
| TÉCNICO | 77/78 tests · 46/47 archivos | 1 falla: credencial `app_runtime` del entorno (TST-01, no es defecto de código) |
| FISCAL | contrato golden 1/1 | 🔲 dorados firmados **0/30** · 🔲 matriz v1 `borrador-no-firmada` · 🔲 M2/M5 · 🔲 acta |
| OPERATIVO | restore drill 0/1 | 🔲 ORR/UAT/capacitación se verifican por firma humana, no por script |

### 2.3 Fases (desde `docs/TODO.md`)

| Fase | Estado |
|---|---|
| F0 línea base | 🧪 F0-01 enviado; 🔲 matriz firmada, 🔲 dorados, 🔲 muestras (límite **16-oct**), 🔲 Sesión 1 formal (23-oct) |
| F1 fundación | ✅ |
| F2 motor IVA | ✅ parcial · 🔲 gate: matriz + dorados |
| F3 importación | ✅ (cola diferida ADR-031) |
| F4 retenciones | ✅ parcial (falta UI edición contador, PDF fiel) |
| F5 libros/resumen | ✅ parcial (🔲 golden real + Excel fiel) |
| F6 cierre · F8 controles | ✅ |
| F7 hardening | ✅ parcial (🔲 T12/T13) |

### 2.4 RDF — la pieza nueva

| Capas | Estado |
|---|---|
| Migración 0023 + `fiscal_decisions`/`fiscal_decision_links`/`rdf_series`/`source_decision_id` | ✅ aplicada en Neon dev |
| Módulo `src/modules/rdf/` (máquina de estados, cobertura, `sha256` canónico, CSV anti-inyección) | ✅ |
| UI `/c/[id]/decisiones` (bandeja/nueva/detalle) + export CSV + ayuda `/docs/datos-base/decisiones` | ✅ |
| Gate `GATE_NO_RDF` en `activateRule` (tras `GATE_NO_COVERAGE`) | ✅ |
| Tests rdf+rules 16/16, fuga cross-empresa, 10 códigos concurrentes, inmutabilidad app+trigger | ✅ |
| **RDF reales firmados** | 🔴 **0 de 7** |

---

## 3. El camino crítico, sin adornos

```
simulación (10-06) → RDF en sistema (10-06) → 7 RDF FIRMADOS → T04 matriz → T05 dorados → T10 → T11
                          ↑ hecho                    ↑ FALTA           ↑          ↑        ↑
                                                          dueño externo    contador   contador  ambos
```

**El único bloqueo real es externo:** sin firma del contador no hay go-live, y el camino tiene
un solo tramo sin dependencias externas entre hoy y la sesión: **T14 (alineación docs-código)**
y **T12/T13 (hardening)**. Todo lo demás espera al contador.

**Fecha crítica:** meta de matriz v1 = **06-nov**. Con 7 RDF sin firmar a fecha 10-07, esa meta
está en riesgo salvo que la firma ocurra en la sesión del 23-oct.

---

## 4. Lo que la cuarta revisión dejó incompleto (heredado)

| # | Pendiente | Ubicación | Impacto |
|---|---|---|---|
| Q-01 | Parches T14 escritos pero **no aplicados** | `CUARTA_REV/diff/index.md §A` | `ARCHITECTURE.md` sigue diciendo "Auth.js o Better Auth" (contr dice ADR-030) |
| Q-02 | `DATABASE.md` documenta `voided_at`/`void_reason`/`replaces_id` en tablas que **no los tienen** | `docs/DATABASE.md:321-323` (compras), `:464` (pagos) | Quien programe contra la spec falla en migración; ADR-033 lo cubre |
| Q-03 | Referencias a archivos inexistentes | `CUARTA_REV/consolidado:198,225` | `taskIN/T01–T15` y `00-INDICE.md` no existen (hay un `CONSOLIDADO-TASK.md`); `TERCERA_REV/task/` borrado |
| Q-04 | `diff/index.md` truncado | fin del archivo | La semilla de dorados (§D) queda a medias |
| Q-05 | `consolidado-docs-2026-10-05.md` viejo 2 días | §8 dice "ADR-001–032" | Ya hay 034 |
| Q-06 | `roadmapRev4 §20` pide artefactos inexistentes | `docs/rdf/`, `docs/operacion/`, `docs/tablero-semanal.md`, `docs/goldens/` | El primero quedó obsoleto: el RDF vive en DB |
| Q-07 | G4 ambiguo | `roadmapRev4 §14` | Exige decidir A (diferir) o B (incluir); `TODO.md` no lo refleja como decisión con dueño |

---

## 5. Hallazgos nuevos de esta revisión (verificados en código)

Verificación automática `docs/DATABASE.md` contra el snapshot Drizzle 0021, tabla por tabla.

### 5.1 Columnas documentadas que NO existen en el físico — 🔴 P1

| Tabla | Doc dice | Físico real |
|---|---|---|
| `purchase_documents` | `voided_at`, `void_reason`, `replaces_id`, `branch_id`, `fx_rate`, `fx_rate_date`, `attachments_count` | Ninguna de las 7 |
| `payments` (eventos) | `voided_at`, `void_reason` | Ninguna |
| `attachments` | `mime_type`, `storage_path`, `uploaded_at`, `uploaded_by` | `mime`, `storage_key`, `created_by`, `created_at` |

`purchase_documents` sí tiene `affected_document_id` (documentado), pero **no** `replaces_id`.
El esquema real de compras termina en `status` + `source_*` + timestamps.

### 5.2 Columnas del físico sin documentar — 🟡 P3

`companies`: 8 columnas de branding/teléfono (`color_distintivo`, `logo_url`, `email_contacto`,
`telefono`, `nombre_comercial`, `sales_mode`, timestamps) — migration 0020, nunca documentada.
`withholding_rules`: `synthetic`, `approved_by`, `approved_at`, `change_reason`.
`iva_withholdings`: `render_status`.
`attachments`: `sha256`, `status` (mencionados en prosa, no en tabla).

### 5.3 Tablas sin sección propia

`islr_withholdings` está documentado como "análogo" (no tabla completa); `sessions`,
`password_reset_tokens`, `fiscal_obligations`, `fiscal_holidays`, `withholdings_received`,
`received_links` viven en listas de prosa.

### 5.4 Alícuota en dos escalas — 🟡 P2 (heredado de sim #2, hallazgo 1)

`purchase_document_lines.tax_rate` guarda **fracción** en import (`deriveAlicuota`: `iva/base`,
`0.160000`) y **porciento** en captura manual (`purchase-form.tsx:68` default `"16"`, placeholder `"16"`).
El motor `computeDocumentTaxes` multiplica `b.times(l.taxRate)` — es decir, **trata el campo
como fracción**. Una compra manual con `taxRate="16"` daría IVA = 16× la base.

Hoy no explota porque: (a) el motor solo se invoca desde `activation-gate` sobre dorados, no
sobre compras reales; (b) la validación de Inv.1 en `fiscal-docs/service.ts` suma el `iva` capturado
en la línea, no el calculado por alícuota. Pero es una bomba de relojería: el primer consumidor
real de `tax_rate` como fracción, se espera a un documento manual.

**Recomendación:** normalizar en el borde de captura (dividir por 100 en la acción manual) o
rechazar `taxRate > 1` con `RATE_SCALE_INVALID`, más un test que fije la convención. No requiere
decisión fiscal: es la misma de la ENMIENDA E-2 (fracción), ya ratificada.

### 5.5 `round2` provisional y dos tolerancias — 🔴 P0 (heredado, sin cambio)

`compute.ts:18` `round2` (HALF_UP 2 decimales) es la única regla de redondeo; `computeDocumentTaxes`
acepta `tolerance = "0.01"` por defecto; `reporting/summary.ts:57` documenta conciliación con
tolerancia 0.01; `reporting/excel-compare.ts:9` dice tolerancia 0. ADR-014 bloqueada por G8.

### 5.6 ADR-033 sigue siendo propuesta con código que depende de ella

`fiscal-docs/repo.ts` excluye `voided` de libro/resumen/conciliación, pero la NC **suma** en los
agregados (`TODO.md` línea 122, hallazgo de la sim #2). El comportamiento correcto está decidido
en ADR-033 pero sin firmar, y el código ya tiene la parte fácil (excluir voided) sin la difícil
(signo). Riesgo: alguien "cierra" elSigns asumiendo el documento.

---

## 6. Estado por tarea (T01–T15) al 2026-10-07

| ID | Tarea | CUARTA_REV | Real 10-07 | Nota |
|---|---|---|---|---|
| T01 | Respuestas F0-01 | 🧪 | 🧪 | Enviado 10-05; sin acuse anotado |
| T02 | Muestras M-1…M-4 | 🧪 | 🧪 | **Límite 16-oct** (9 días) |
| T03 | Sesión 1 Tier A | 🔲 | 🟡 | Sim de 6 pasos OK el 10-06; **RDF sin firmar** |
| T04 | Matriz v1 firmada | ⛔ | ⛔ | Meta 06-nov |
| T05 | Dorados 30–50 | ⛔ | ⛔ | 0/30; 1 fixture sin firmar |
| T06 | Redondeo + tolerancia | ⛔ | ⛔ | ⛔ tras RDF G8 |
| T07 | G2 + IVA consume eventos | ⛔ | ⛔ | ⛔ tras RDF G2 + firma ADR-033 |
| T08 | Catálogos + modo Z + perfiles | ⛔ | ⛔ | ⛔ T04/M-1…M-2 |
| T09 | Excel + paridad | ⛔ | ⛔ | ⛔ M-4 |
| T10 | Mes real + M5 | ⛔ | ⛔ | ⛔ T02+T04+T05 |
| T11 | UAT + cutover | ⛔ | ⛔ | ⛔ T10 |
| T12 | Rotación secretos | 🔲 | 🔲 | Runbook §1/§3 listo; §6 sin firmar |
| T13 | Rol mínimo + restore drill | 🔲 | 🔲 | `DB_LEAST_PRIVILEGE` en staging sin probar |
| T14 | Alineación docs-código | 🔲 | 🟡 | **Parches escritos, no aplicados** (Q-01, Q-02) |
| T15 | Tablero semanal | 🔲 | 🔲 | Plantilla en `diff/index.md §B` |

---

## 7. Deuda heredada de la simulación #2 (retro `retrospectiva-sim2.md`)

| # | Hallazgo | Severidad | Destino |
|---|---|---|---|
| 1 | Alícuota en dos escalas | P2 | **Nuevo §5.4** |
| 2 | Redondeo por línea vs total (`1.179,12` vs `1.179,11`) | P0 | RDF G8 → T06 |
| 3 | NC elegible para retención (`001-00004` en la lista) | P0 | ADR-033 → T07 |
| 4 | `settlement_event` vs filtro `payment` en bitácora | P3 | Backlog |
| 5 | Sin `DIRECT_URL` el comando `sim:limpieza` no corre | P3 | Documentado; ya tiene fallback |

**Cero P0/P1 resueltos.** Las tres P0/P2 de la sim siguen abiertas y las dos graves dependen de
firma del contador.

---

## 8. Qué es lo único que esta revisión puede cerrar sin el contador

Ninguna decisión fiscal. Pero sí, en este orden:

1. **T14 completo** (Q-01, Q-02, Q-05, Q-06): que la spec no mienta sobre el código.
2. **§5.4 alícuota**: bug latente con definición clara, sin consulta al contador.
3. **Q-03, Q-04**: hygiene de referencias.
4. **T15 tablero**: una tabla, cinco minutos, da control de desvío.
5. **T12/T13**: rotación y drill, si hay servidor.

Ver `taskIN/CONSOLIDADO-TASK.md` (tareas Q-01…Q-12 con aceptación) y `roadmapRev5.md` (orden).