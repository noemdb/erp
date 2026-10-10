# TODO.md — ERP-TributarioLite

> Fuente de verdad del estado técnico y documental. F1–F6 están implementadas parcial o mayormente; faltan gates fiscales y validación operativa. Un bloque es ✅ solo con checklist Paso 04 completo. Roadmap base: `blueprint/ROADMAP-ERP-TributarioLite.md` F0–F7.
> Verificación QUINTA_REV aplicada al código el **2026-10-08** (`7e355cb`): ver § “Verificación QUINTA_REV — 2026-10-08”. Solo documentación, sin cambios de código.

## Leyenda
- 🔲 Por hacer — 🧪 En pruebas — ✅ Hecho — ⛔ Bloqueado

## Estado docs (v0.1 propuesta)

| Doc | Estado | Nota |
|---|---|---|
| `ARCHITECTURE.md` | ✅ | PG ≥16 + Drizzle; Q-01/Q-02 aplicados 2026-10-08 (auth propio ADR-030, `render:retry` en stack/mermaid/despliegue) |
| `DOMAIN.md` | ✅ | Glosario, invariantes, estados |
| `DATABASE.md` | ✅ | Q-03 aplicado 2026-10-08 (`purchase_documents`/`payments`/`attachments` alineados al físico; `companies` branding + `withholding_rules` aprobación/`source_decision_id` + `render_status` documentados; orden migraciones hasta 0023; § RDF como implementada). Deuda P3 restante: `islr_withholdings` sin tabla propia (prosa), `scripts/verify-docs-schema.ts` lo reporta |
| `API.md` | ✅ | Contrato actualizado + `RATE_SCALE_INVALID` (Q-05); `render:retry` con gatillos y `pg-boss` diferida |
| `SECURITY.md` | ✅ | Regenerado RBAC rol×empresa |
| `CONVENTIONS.md` | ✅ | Regenerado |
| `DECISIONS.md` | ✅ | ADR-001–034 (013/014 bloqueados; 018–020 propuestos; 008 diferida por 031; 021–032 aceptadas; 033 propuesta; 034 aceptada e implementada 2026-10-06) |
| `PROJECT.md` | ✅ | Elevator pitch, alcance y métricas definidos |
| Cuestionario PDF vs G1–G12 | ✅ | Contrastado, ver ROADMAP §3/§11 |
| `anexos/` (matriz generada, RDF, diferimiento, roles, bitácora) | ✅ parcial | Plantillas e infra listas; falta matriz v1 + dorados firmados |

## Plan por fases

### F0 — Línea base fiscal (requiere contador)
| Bloque | Estado | Notas |
|---|---|---|
| Paquete contador (`anexos/paquete-contador.md`) | ✅ | Enviable: matriz preliminar + checklist + preguntas; 17 escenarios candidatos no aprobados ni ejecutables como dorados. **F0-01 enviado 2026-10-05**: carátula `anexos/pedido-F0-01.md` (18 preguntas asesoría §9 + 5 formato ROADMAP-03 §3.7 + post-cierre + piloto/tiempos + M-1…M-4). Pendiente: anotar canal/acuse y respuesta del contador |
| Matriz Reglas v1 firmada | 🔲 | Borrador legal IVA iniciado; falta cotejo/firma y completar ISLR por concepto |
| RDF en sistema + asociación a regla (spec `blueprint/rdf/`, ADR-034) | ✅ | Implementado 2026-10-06: migración 0023 aplicada en Neon dev (`fiscal_decisions` + links + `rdf_series` + `source_decision_id`, RLS + trigger `rdf_immutable`); módulo `rdf` (máquina estados, cobertura, `sha256` canónico, CSV anti-inyección); UI `/decisiones` (bandeja/nueva/detalle por rol) + ayuda `/docs/datos-base/decisiones`; `activateRule` fail-closed (`GATE_NO_COVERAGE` → `GATE_NO_RDF`); tests rdf+rules 16/16 + typecheck + lint 0 errores + build verdes. Valores fiscales reales siguen exigiendo matriz v1 firmada |
| Escenarios dorados 30–50 | 🔲 | `pendientes/TERCERA_REV/files/dorados-candidatos-normalizados-F0.json`: 17 candidatos, 12 ejecutables, 5 no (ISLR-07/09, ABONO-01/02/03); 9 firmables hoy (IVA-03/04 prueban reglas no implementadas). La meta de 30 exige ~21 casos nuevos (`blueprint/goldenValidation/04-tests-rollout.md §2`). No son fixtures ejecutables ni gate aprobado. Faltan escenarios firmados por contador. |
| Mecanismo de firma de dorados (spec `blueprint/goldenValidation/`) | 🧪 | Propuesta 2026-10-07. **Fase 0.1–0.4 implementada**: canónico único (`modules/shared/canonical.ts`, D9), `engine.test.ts` soporta `noAplica` (D6), `schema.json` con `estado` obligatorio/`esperado` tipado/`noAplica`/`taxRate` fracción (D3), `FraccionSchema`/`MoneySchema` (Q-05). **Fase 3+4 parciales (file-backed)**: módulo `modules/goldens` (listar/ejecutar/verificar/cobertura + **firma Opción 1** `signGoldenCase` con `goldens.sign` y RG-02/RG-03) y UI `/c/[companyId]/dorados` (bandeja + ficha + dialog de firma). **Pendiente (gated por ADR-035 del contador)**: migraciones 0024-0027, firma con llave propia (Opción 2), `goldens:export`/`verify` en DB, gate en DB, Fase 5 (migrar fixtures a DB). |
| Muestras reales | 🔲 | XLSX disponible; validar como golden y confirmar ≥1 mes de CSV legacy + Z reales |
| Decisiones G1–G12 y roles | 🧪 | Precisiones parciales y asesoría técnica recibidas 2026-10-01; propuestas no son decisiones fiscales aprobadas. Ver `anexos/checklist-F0.md` y `pendientes/PRIMERA_REV/asesoria-fiscal-F0.md` |

**Precisiones recibidas 2026-10-01 (no equivalen a aprobación fiscal):** IVA mensual; moneda base bolívares, USD como moneda de referencia y tasa oficial BCV (pendientes fecha/tipo de tasa y diferencias cambiarias); ventas por sucursal (pendiente fuente factura/Z); redondeo de “8 cifras decimales significativas” (pendientes método y etapa); perfiles de beneficiarios naturales/jurídicos residentes/no residentes. La hoja `anexos/decision-abonos-G2-contador.md` prepara cuatro decisiones G2 para sesión, sin respuestas ni firma. `pendientes/PRIMERA_REV/asesoria-fiscal-F0.md` aporta recomendaciones no firmadas y 17 candidatos de escenarios, tampoco aprobados. XLSX disponible en `blueprint/datos/formatos_libro_de_compras_libro_de_ventas_resumen_comprobante_ret_de_islr_comprobante_de_retencion_iva.xlsx`. La normativa consultada establece pago o abono en cuenta, lo que ocurra primero; G2 usa `unset` por defecto, comparación dual y bloqueo de divergencias, sin cerrar la validación fiscal.

### F1 — Fundación + esqueleto vertical (2 sem)
| Bloque | Estado | Aceptación |
|---|---|---|
| Repo/tooling/CI (TS strict, lint, boundaries, conventional) | ✅ | typecheck+lint+tests verdes. Hecho 2026-09-30 (`npm ci && npm run typecheck && npm run lint && npm test` verdes) |
| Env + DB base Neon sin Docker (ADR-015), migraciones 0000–0001 | ✅ | staging reproducible. EXT btree_gist/citext/pgcrypto + 7 tablas + FK + EXCLUDE verificados |
| withTenant + authorize + RLS + fuga tenants | ✅ | Fuga verde en Neon dev. `set_config` (SET con bind falla en prepared), RLS en 4 operativas, test aislamiento+authorize. Owner bypassa RLS → app hace cumplir, rol least-privilege en F7 |
| Sesiones DB (login/logout/reset) + rate limit | ✅ | Login funcional con seed admin + empresa demo. Tablas `sessions`/`audit_events`, `audit.record()` en TX, UI /login /companies /c/[id] con cabecera Empresa·Período·Rol, `npm run build` verde |
| Audit v0 `audit.record()` | ✅ | En TX (incluido arriba, test verde) |
| Esqueleto: 1 compra manual → Libro Compras PDF+Excel provisional | ✅ | M1 logrado provisional: formulario + lista + libro HTML + CSV con anti-inyección, test verde, build verde, /login vivo 200. PDF/Excel fiel pasa a F5 (spike ADR-009) |

### F2 — Núcleo fiscal y motor IVA (3 sem, gate: matriz + dorados)
| Bloque | Estado | Aceptación |
|---|---|---|
| tax-engine puro + dorado inicial + propiedades Inv.1–3 | ✅ | `computeDocumentTaxes/Iva/Islr + puedeAplicarNC`, fixture IVA-01 verde, fast-check 200–300 runs, round2 provisional documentado. Faltan 30–50 dorados del contador (gate) |
| Terceros + perfil historial + RIF dual | ✅ | upsert con RIF normalizado/original, `setTaxProfile` cierra vigencia y abre nueva (EXCLUDE como red), UI lista/nuevo/detalle+historial, test verde |
| Períodos `open→under_review→closed→reopened` + UI | ✅ | Transiciones validadas, `closure_hash` sha256, reapertura con motivo, compra en cerrado → PERIOD_CLOSED, test ciclo completo. Trigger DB + checklist en F6 |
| Catálogos + ventas/pagos mínimos + recibidas G3 | ✅ parcial | Ventas + libro + eventos pago/abono + UI/tests. **G3 implementada (1.0.2)**: `withholdings_received` + links + flujo registrada→conciliada→aplicada + línea en resumen sin neteo + UI + test. Queda: modo Z (F3), catálogos tasas (con matriz). Gate G3: caso real + validación contador |
| Captura estructural de eventos G2 | ✅ parcial | Migración 0011 aplicada en Neon dev; columnas, RLS, políticas y constraints verificados. Pruebas de asignación concurrente y retención con fecha efectiva verde. IVA aún no consume eventos; gate fiscal permanece abierto. |
| Criterio G2 configurable, preview dual y convergencia | ✅ parcial | Migración 0012 agrega `abono_criterion` (`unset` por defecto); solo contador puede cambiarlo con motivo auditado. Preview compara evento/fecha/período/regla, base, sustraendo/condiciones, monto y asignación bajo `payment_only` y `account_credit_or_payment`; `unset` permite emitir solo pago asignado si los resultados convergen, y bloquea divergencias/ambigüedad. Emisión serializada contra criterio/eventos; evento retroactivo tras ISLR vigente requiere anular y revisar. Criterio configurado se aplica explícitamente; no decide por sí mismo UT, base por porción ni sustraendo parcial. Pruebas integradas en Neon dev; typecheck/lint/build verdes. No cierra F0. Hoja del contador en `anexos/decision-abonos-G2-contador.md`. |
| `computeDocumentTaxes` puro + dorados IVA 100% + property | 🔲 | Motor listo; gate: sin matriz v1 + 30–50 dorados del contador no se cierra F2. **Q-05 cerrado 2026-10-08**: borde manual/ventas rechaza `>1` con `RATE_SCALE_INVALID` (fracción `0.16`); formularios en fracción; `rate-scale.test.ts` 4/4; 18 tests migrados a `0.16` (suites DB no ejecutables aquí: Neon ECONNRESET preexistente verificado en árbol limpio) |

### F3 — Importación CSV (2.5 sem)
| Bloque | Estado | Aceptación |
|---|---|---|
| Staging + subida idempotente | ✅ | `source_files` íntegro + `sha256` dedup + tipo por contenido + UI subir/lotes/detalle + test. typecheck+lint+17 tests+build verdes |
| Parser + validación + preview (F3-2) | ✅ | Separador/BOM, coma-punto, fechas DD/MM+ISO, nulos sin "0", alias columnas, valid/warning/rejected + contadores, UI preview + revalidar. 19 tests verdes. Perfiles de mapeo guardables quedan pendientes si el legacy lo exige |
| Confirmación → documentos + Z + async (F3-3) | ✅ | Solo válidas+advertencias → docs (alícuota derivada documentada), trazabilidad archivo+fila+lote, revalidar conserva imported (idempotente), Z con máquina auto + salto=advertencia, rechazadas.csv, test confirma+reconfirma+Z. Cola `pg-boss` diferida (ADR-031); reintento por `render:retry` del host |
| Alias legacy + avisos explícitos (F3-4) | ✅ | `monto_iva/total_factura/nombre_proveedor` resuelven a canónicas; `tipo_doc`≠F se rechaza (NC/ND a manual), `abono≠0` avisa (warning, evento G2 manual), `alicuota_iva/fecha_recepcion` en `mapping_profile.ignoredColumns` + nota UI. Test casoUso003 + suite imports 7/7 verde, typecheck+lint verdes |

### F4 — Retenciones IVA/ISLR (3 sem)
| Bloque | Estado | Aceptación |
|---|---|---|
| Reglas vigencia + conceptos ISLR + `explanation[]` | ✅ parcial | 8 tablas + EXCLUDE + seed 75%/conceptos + `reserveNumber` sin huecos (test 20 concurrentes + rollback). Falta UI edición contador |
| Emisión transaccional multi-factura + anulación `replaces_id` | ✅ parcial | Preview + emisión IVA e ISLR (período, número, snapshot+hash, líneas, audit) + anulación/sustitución con motivo + UI bandeja/nueva/detalle + test ciclo y 5 paralelas únicas. Hallazgo: reintento en TX abortada no recupera → UPSERT atómico de una sentencia. Render PDF fuera de la TX (ADR-027). Falta: UI edición contador + PDF fiel (→ F5) |
| PDF/Excel fiel + concurrencia emisión 50–100 | ✅ parcial | ISLR (concepto+pago, serie provisional `ISLR-AAAAMM-######`, UI, test) + entrega IVA con fecha + UI. Render ISLR post-commit archivado (REP-01, `renderIslrPdf` + matriz `anexos/matriz-render-v1.md`); Excel sobre plantilla y paridad art. 16 tras formato aprobado. Control de plazo pendiente de valor contador |
| Reporte CSV retenciones IVA (`iva-withholdings`) | ✅ 2026-10-05 | `GET /api/companies/[id]/reports/iva-withholdings?periodId=&format=csv` (documentado en `API.md`, faltaba ruta): `getIvaWithholdingsReport` + CSV con anti-inyección + CTA en bandeja. Aceptación: 401 sin sesión, 403 sin `reports.read`, CSV con columnas `comprobante,emision,rif_beneficiario,razon_social,retenido,estado` (anulados marcados), filtro `periodId`, tests puros + integración, build verde. PDF/Excel fiel queda en F5 |

### F5 — Libros y Resumen (2.5 sem)
| Bloque | Estado | Aceptación |
|---|---|---|
| Resumen/conciliación + drill-down + versionado | ✅ | `getIvaSummary` (débito/crédito/retenciones/cuota) + `getConciliation` tol 0.01 + `saveSummaryVersion`/`checkReproducible` + UI con drill-down. Test cuadra+congela+detecta cambio. 26 tests verdes |
| Comparador 2.A + bitácora D1–D5 (infra, sin golden validado) | ✅ parcial | `golden:inspect` (inventario sin valores + sha256) + `golden:compare` (bitácora D1–D5, aprobadas con vigencia, exit 1 si hay abiertas) + tests sintéticos. Gate sigue bloqueado: requiere xlsx golden validado |
| Regresión celda a celda vs golden + PDF/Excel fiel (spike ADR-009) | 🔲 | Siguiente. Requiere xlsx golden del cliente |

### F8 — Conciliación automática (roadmap 1.0.1)
| Bloque | Estado | Aceptación |
|---|---|---|
| 7 controles + UI + test | ✅ | `getAutoControls` solo-lectura (período, base, IVA, duplicados, retención, respaldo, cobertura) + `findDuplicates` puro + UI en resumen + test con doc inconsistente. 30 tests verdes |

### F6 — Cierre y auditoría (2 sem)
| Bloque | Estado | Aceptación |
|---|---|---|
| Checklist, cierre `closure_hash`, bloqueo doble capa, reapertura, ajustes, vista auditor | ✅ | Triggers anti-mutación (4 tablas) + NC≤saldo en DB, checklist bloqueante integrado al cierre, detalle período, bitácora + CSV, test a dos niveles. 27 tests verdes. Ajustes post-cierre vía reapertura (tabla `fiscal_adjustments` diferida a F7 si se exige) |

### F7 — Hardening y operación (3 sem)
| Bloque | Estado | Aceptación |
|---|---|---|
| Health + logs + runbooks | ✅ | `/api/health` vivo (db+storage), pino con redacción PII (test), runbooks restore/reapertura/rotación/reglas. 28 tests verdes |
| Rol mínimo + reporte migración + headers + UAT/manuales/runbooks/checklist/acta (1.0.5) | ✅ | `app_runtime` creado y verificado (prueba negativa), `migration-report/`, headers HSTS/nosniff/DENY, `docs/uat`, `docs/manuales`, 4 runbooks nuevos, checklist + acta. 49 tests + build verdes |
| Migración histórica, paralelo Excel vs sistema, UAT, go-live | 🔲 | Requiere contador + muestras reales (M5/M6). Actas y guiones listos |
| Ledger de emisiones + reconcile de series (2.0.5 §5.3) | ✅ | `appendEmission` post-commit IVA/ISLR (best-effort), `certSeq` por formato, `reconcileSeries` + `series:reconcile` (OK/GAP_DB/GAP_LEDGER), runbook restore. Test con restore simulado |

### 1.0.4 Aceptación técnica (gates fiscales pendientes del contador)
| Criterio | Estado técnico | Evidencia |
|---|---|---|
| Golden ejecutados 100%, 0 fallos/omitidos | ✅ infra (1 didáctico; 30–50 firmados pendientes) | `acceptance/test-results/golden-results.json`, manifest sin omitidos |
| Properties 100% verdes | ✅ | `acceptance/test-results/property-tests.json` |
| Fugas 0 (matriz cross-company) | ✅ | `fuga-matrix.test.ts` |
| Concurrencia 50 reservas + 20 emisiones, 0 duplicados | ✅ | `series.test.ts`, `issue-iva.test.ts` |
| Mismo documento simultáneo → 1 gana | ✅ | `same-doc.test.ts` (lock asesoría) |
| E2E servicios (import→cierre) | ✅ | `e2e-flow.test.ts` |
| Reporte aceptación | ✅ | `acceptance/acceptance-report.md` (`npm run acceptance:evidence`) |
| Período real M2/M5, dorados firmados | 🔲 | Bloqueado: muestras + firma contador |
| Playwright arnés + humo por rol | ✅ | `playwright.config.ts` + `e2e/seed.ts` (4 roles) + setup por UI con storageState + reloj controlado + humo login/dashboard por rol + negativa (6/6 local). Recorridos P0 en ACC-06 |
| Playwright P0 + negativos + seguridad | ✅ | `p0.journeys` (compra contador crea→lista, importación preview con advertencia tercero-nuevo, reglas por rol) + `p0.security` (cross-tenant→dashboard, API 401, página→login, rate-limit al 6.º). 14/14 local contra dev |
| Gate activación (dorados antes de activar) | ✅ | `activation-gate.ts` en `transition()`: no sintético exige ≥1 firmado de su clase con 100% reproducido (`GATE_NO_COVERAGE`/`GATE_FAILED`); sintético omite (no activable en prod). Firmas ligadas al hash (ACC-02) |

### 2.0.2 Ola 1 (R3/R4 del cliente)
| Bloque | Estado | Aceptación |
|---|---|---|
| Adjuntos 7.A–7.B + recuperación 6.A + runbooks | ✅ | UploadThing/fs por sha256, magic bytes, dedup, HMAC+TTL, tokens un solo uso, break-glass. 57 tests + build verdes |

## Correcciones operativas dev (2026-10-05)
| Bloque | Estado | Notas |
|---|---|---|
| Anulación compras + corrección NC 001-00004 (fila 9 lote f785fdcc) | ✅ | `voidPurchaseDocument` + action + UI Anulación + `voided` excluido de libro/resumen/conciliación; tests 2/2 nuevos; datos dev corregidos (ND→voided, NC credit_note 2023-09-10). Checklist: typecheck + lint 0 errores + suites fiscal-docs/reporting/imports 25/25 verdes; `docs.create` reutilizado (sin permiso nuevo); motivo en auditoría, sin PII en logs. Deudas intactas: signo NC en agregados (requiere ADR → ADR-033 propuesta 2026-10-05) y `voided_at` de `DATABASE.md:321` inexistente en físico (→ ADR-033: migración aditiva propuesta) |
| Caso práctico sim #2 en `/docs` (sección 5, 4 páginas) | ✅ | `caso-practico/resumen+carga+comprobacion+cierre` con pasos en 2 columnas (guía/práctica), cifras reales sim #2, sin tecnicismos ni URLs, rutas como `Panel → X`. Checklist: typecheck + lint 0 errores + `build` verde (4 rutas en manifiesto); sin API nueva, sin sensibles, sin ADR nuevo. Retro en `retrospectiva-sim2.md` |

## Roadmap R0–R5 — ejecución (2026-10-09, pedido cliente `blueprint/requerimiento/`)

> Orden canónico: entorno → R1 libros → R2 comprobantes+correlativo → R3 resumen → R4 XML/TXT (gated Q14) → R5 cierre+aceptación. G4/G8/G9: documentar, no codificar solución definitiva (regla de hierro). Sin matriz v1 firmada + RDF no se activa regla fiscal nueva (`GATE_NO_RDF`).

| Bloque | Estado | Aceptación |
|---|---|---|
| B1 — Endurecer `src/db/client.ts` (riesgo entorno): singleton dev + timeouts | ✅ 2026-10-09 | `client.ts`: singleton `globalThis` en dev (fin pools duplicados por HMR) + `connect_timeout:15`/`idle_timeout:20`/`max_lifetime:600`, `prepare:false` intacto (F1). Checklist: typecheck 0 nuevos (11 preexistentes en `.next/`, idéntico en árbol limpio) + lint 0 errores + import OK singleton + puras 8/8 (`rate-scale` 4 + `properties` 4, con env). Sin API nueva, sin sensibles, sin ADR (infra dentro de ADR-015/023). Conexión real pendiente de entorno con Neon (ECONNRESET preexistente) |
| B2 — Correlativo ISLR en CSV (espejo del IVA, R-E4) | ✅ 2026-10-09 | `getIslrWithholdingsReport` + `toIslrWithholdingsCsv` (mismas 6 columnas, anulados marcados, filtro `periodId`, anti-inyección `=+-@`) en `issue-islr.ts`; ruta `GET .../reports/islr-withholdings` (401/403 espejo IVA); CTA Descargar CSV en bandeja `retenciones-islr`; `islr-report.test.ts` (2 puras + 1 integración); `API.md` documentado en el momento. Checklist: typecheck 0 errores + lint 0 + puras 2/2 verdes; integración pendiente de entorno con Neon (ECONNRESET preexistente, igual que IVA aquí). Sin permiso nuevo (`reports.read` reutilizado), sin sensibles, sin ADR |
| B3 — Paquete de cierre descargable por período (R5) | ✅ 2026-10-09 | Manifiesto JSON versionado `closing_package` (6 secciones con `count`+`sha256`, resumen+conciliación embebidos, `sha256` global, enlaces CSV): `closing-package.ts` (`get`/`freeze`/`checkPackageReproducible` + puras `sectionSha`/`buildPackage`) + ruta `GET .../reports/closing-package?periodId=` (400 sin período) + `freezeClosingPackageAction` (solo contador, `periods.close`, audit en TX) + CTA Paquete (JSON) en detalle de período + `closing-package.test.ts` (3 puras). `API.md` documentado en el momento; `DATABASE.md` suma `closing_package` al CHECK de `kind`. Checklist: typecheck 0 + lint 0 + puras 3/3 + `docs:verify-schema` sin P1 + `boundaries` 0 nuevas (72 preexistentes, idéntico en árbol limpio). Integración DB pendiente de Neon. Sin permiso nuevo, sin ADR |
| B4 — Generadores XML ISLR / TXT IVA (R4, gated Q14) | ⛔ | Bloqueado: requiere Q14=Sí + layouts oficiales + ejemplos aceptados. Sin spec no se codifica |
| B5 — Botón Congelar paquete en período (cierra loop B3) | ✅ 2026-10-09 | `PeriodButtons` (under_review/closed, solo contador vía `canManage`) dispara `freezeClosingPackageAction`, muestra `v{N} + sha12` y refresca; errores con el mismo mapa es-VE. Checklist: typecheck 0 + lint 0; runtime pendiente de Neon (misma causa). Sin API nueva, sin sensibles, sin ADR |
| B6 — Sección Casos de Uso (`/casos-uso`) + item en menú (R-O1…R-E8) | ✅ 2026-10-09 | Item con el mismo estilo del menú tras Manual; página espejo de `/manual` (guardia sesión, `ManualLayout` con índice+scroll-spy, tarjetas por caso con pasos numerados + ejemplo ficticio + pantalla + badge de estado, sección flujos con `id="diagramas"`). Checklist: typecheck 0 + lint 0; cifras/terceros ficticios (sin PII), sin API nueva, sin ADR |
| B7 — Diagrama R-O1 Libro de Compras mensual (flujo interactivo) | ✅ 2026-10-09 | `r-o1-libro-compras.{md,html}` (plantilla skill: 5 nodos, modos mes abierto/cerrado, 3 historias, cierre solo en modo cierre) + registro en `_flows.tsx` + botón Ver flujo en tarjeta R-O1. Checklist: typecheck 0 + lint 0 + JS válido + 7/7 pasos contra nodos + captura Playwright sin errores (arranque, cambio de flujo y de modo). Sin API nueva, sin ADR |
| B8 — Botón pantalla completa del diagrama (Fullscreen API + `allowFullScreen`) | ✅ 2026-10-09 | Causa: solo alternaba clase CSS (en el diálogo llenaba el iframe de 68vh). Parche idéntico en los 17 `public/docs/flujos/*.html` + plantilla del skill: Fullscreen API con repliegue a clase + `fullscreenchange` que sincroniza y redibuja; `allowFullScreen` en el iframe de `FlowButton`. Checklist: JS válido + humo Playwright standalone (entra/sale con Escape, clase sincronizada) e iframe (propaga a fullscreen del navegador) + captura + typecheck 0 + lint 0. Sin API nueva, sin ADR |
| B9 — Diagrama R-O2 Libro de Ventas mensual (skill generar-diagrama) | ✅ 2026-10-09 | `r-o2-libro-ventas.{md,html}` (5 nodos, modos factura/Z con swap de etiqueta por modo, 3 historias con auto-cambio de modo) + registro + botón en tarjeta R-O2. Hallazgo y fix: atributos de modo llevan guion (`data-tech-online`, no `data-techOnline`) — corregido también en R-O1. Checklist: validación del skill (0 `{{}}`, 8/8 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + typecheck 0 + lint 0. Sin API nueva, sin ADR |
| B10 — Diagrama R-O3 Resumen de IVA mensual (skill generar-diagrama) | ✅ 2026-10-09 | `r-o3-resumen-iva.{md,html}` (5 nodos, modos reviso/congelo heredados, 3 historias con auto-cambio a congelo; corregido `flowName` inicial "RAG Query" heredado + `port` "dato del mes" → cifras/versión). Checklist: validación del skill (0 `{{}}`, 11/11 pasos contra nodos, JS válido) + humo Playwright (3 flujos, captura) + typecheck 0 + lint 0. Sin API nueva, sin ADR |
| B12 — Configuración admin: backup/restore/limpieza DB | ✅ 2026-10-09 | Pedido cliente: sección `/configuracion` solo admin (item en menú tras Gestión de usuarios, mismo gate `users.manage`). `modules/maintenance` (service puro + `repo.ts` con rol migrador + `actions.ts`): backup `GET /api/admin/database/backup` (pg_dump plano, 5/hora), restore `POST .../restore` (.sql ≤100 MB, `ON_ERROR_STOP=1` todo o nada, 3/hora), limpieza `cleanDatabaseAction` (ELIMINAR + motivo, 1 TX ordenada, elimina empresas + operativo + no preservados; conserva admins + 4 prácticas + conceptos globales + IVA 75% + migraciones; 3/hora). Constancia en log (sin PII) + resultado en UI (ADR-037). Checklist: typecheck 0 + lint 0 + puras 8/8 + boundaries 0 nuevas; integración DB pendiente de Neon. `API.md`/`SECURITY.md` documentados en el momento. Sin permiso nuevo (`users.manage` reutilizado). **Fix mismo día (`BACKUP_FAILED` version mismatch: servidor PG 18 vs pg_dump 16)**: `resolvePgBin` elige el cliente más nuevo (`PG_DUMP_PATH`/`PSQL_PATH` → `/usr/lib/postgresql/*` → `~/.local/pg18/bin` → PATH) + código `BACKUP_VERSION_MISMATCH`; cliente 18 instalado en espacio de usuario (PGDG, sin root) + backup real verificado (173 KB, `Dumped by pg_dump 18.6`); puras 9/9. |
| B13 — R-E4 correlativo quincenal (contenido + diagrama + detector + cruce) | ✅ 2026-10-10 | Pedido cliente (4 mejoras). **Contenido**: typo `anadida→anulada`, ejemplo con ISLR provisional + entregada, aclaración numeración mensual vs Q1/Q2, paso 4 refleja que el paquete ya trae las secciones. **Diagrama** `r-e4-correlativo.{html,md}` (base R-E3: 5 nodos, modos Q1/Q2, 3 historias IVA/ISLR/anexo; id coincide con el stub pre-registrado en `_flows.tsx`, solo se actualizó su footer) + `flow` en tarjeta R-E4. **Detector**: `correlativo-gaps.ts` puro (`certSeq`/`findCorrelativoGaps`, anulados = consumidos, Q1/Q2 independientes, no comparables informados) + `getCorrelativo` (totales por estado + cruce contra `document_series`) + `GET .../reports/correlativo-gaps` (`reports.read`) + KPI Secuencia en ambas bandejas con hint a `series:reconcile`. **Cruce honesto**: el resumen deriva de las mismas tablas, así que el cruce independiente es correlativo ↔ serie (documentado en `API.md`). Checklist: typecheck 0 + lint 0 + puras 7/7 + humo Playwright 3 flujos + captura + boundaries 0 nuevas; integración DB pendiente de Neon. Sin permiso nuevo, sin ADR. |
| B14 — Mejoras `/configuracion` (estado + sha + red restore + preview/por empresa) | ✅ 2026-10-10 | Pedido cliente (4 elegidas, extiende ADR-037 sin ADR nuevo). **Estado**: `GET .../status` (tamaño `pg_database_size` + conteos + historial JSONL sin PII en `/storage`) + tarjeta en página. **Backup**: headers `X-Backup-Sha256/Bytes/Tables/Complete` + panel verificado con copiar hash (`verifyDumpSql` puro). **Restore**: copia previa automática en `/storage/.safety` (últimas 3, fail-closed `SAFETY_FAILED`) + `GET .../restore-check` (empresas, series, último cierre) con botón en UI. **Limpieza**: `previewCleanAction` (simulacro) + selector todas/una empresa con poda de huérfanos (mismo orden FK; storage fs solo en total). Checklist: typecheck 0 + lint 0 + puras 13/13 + boundaries 0 nuevas; integración DB pendiente de Neon. `API.md`/`SECURITY.md`/runbook al día. Sin permiso nuevo. |
| B11 — Diagrama R-O4 XML ISLR mensual (skill generar-diagrama, proceso diseñado gated Q14) | ✅ 2026-10-09 | `r-o4-xml-islr.{md,html}` (5 nodos, modos preparo/declaro propios, 3 historias con auto-cambio a declaro, gate Q14 en eyebrow/nota/footer) + registro + botón en tarjeta R-O4. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, captura) + typecheck 0 + lint 0. Sin API nueva, sin ADR |
| B12 — Diagrama R-E1 Compras quincenal Q1/Q2 (skill generar-diagrama) | ✅ 2026-10-09 | `r-e1-compras-quincenal.{md,html}` (5 nodos, modos Q1/Q2 con swap de rango, historias Q1/Q2 con auto-cambio + cierre común) + registro + botón en tarjeta R-E1. Checklist: validación del skill (0 `{{}}`, 8/8 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados (2 errores ajenos: `config-forms.tsx` untracked de otro frente + `.next` generado). Sin API nueva, sin ADR |
| B13 — Diagrama R-E2 Ventas quincenal Q1/Q2 (skill generar-diagrama) | ✅ 2026-10-09 | `r-e2-ventas-quincenal.{md,html}` (5 nodos, modos Q1/Q2 con swap de rango, historias Q1/Q2 con auto-cambio + cierre común, factura/Z en pasos) + registro + botón en tarjeta R-E2. Checklist: validación del skill (0 `{{}}`, 8/8 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B14 — Diagrama R-E3 Resumen IVA quincenal Q1/Q2 (skill generar-diagrama) | ✅ 2026-10-09 | `r-e3-resumen-quincenal.{md,html}` (5 nodos, modos Q1/Q2 con swap de cuota, historias Q1/Q2 con auto-cambio + excedente Q1→Q2 + cierre común) + registro + botón en tarjeta R-E3. Checklist: validación del skill (0 `{{}}`, 11/11 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B15 — Diagrama R-E4 Correlativo IVA+ISLR quincenal (skill generar-diagrama) | ✅ 2026-10-09 | `r-e4-correlativo.{md,html}` (5 nodos, modos IVA/ISLR con swap de serie, historias con auto-cambio + anexo común) + registro + botón en tarjeta R-E4. Checklist: validación del skill (0 `{{}}`, 8/8 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B16 — Diagrama R-E5 Comprobante IVA por comprobante (skill generar-diagrama) | ✅ 2026-10-09 | `r-e5-comprobante-iva.{md,html}` (5 nodos, modos Q1/Q2 con swap de serie, armo/emito con auto-cambio + entrego común) + registro + botón en tarjeta R-E5. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B17 — Diagrama R-E6 Comprobante ISLR por comprobante (skill generar-diagrama) | ✅ 2026-10-09 | `r-e6-comprobante-islr.{md,html}` (5 nodos: evento G2 + preview dual + serie provisional con swap, historias con auto-cambio + entrego común) + registro + botón en tarjeta R-E6. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B18 — Diagrama R-E7 XML ISLR mensual Q1+Q2 (skill generar-diagrama, gated Q14) | ✅ 2026-10-09 | `r-e7-xml-mensual.{md,html}` (5 nodos, modos Q1/Q2 con swap de base parcial/total, junto/agrego con auto-cambio + archivo común, gate en eyebrow/nota/footer) + registro + botón en tarjeta R-E7. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B19 — Diagrama R-E8 TXT IVA quincenal (skill generar-diagrama, gated Q14) | ✅ 2026-10-09 | `r-e8-txt-iva.{md,html}` (5 nodos, modos Q1/Q2 con swap de TXT, genero con auto-cambio + archivo común, gate en eyebrow/nota/footer; corregida etiqueta heredada "Versión congelada" → "Paquete de cierre" + orden de leyenda) + registro + botón en tarjeta R-E8. Checklist: validación del skill (0 `{{}}`, 8/8 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B20 — Diagrama Cierre mensual ordinario (skill generar-diagrama) | ✅ 2026-10-09 | `cierre-mensual.{md,html}` (6 nodos, modos abierto/cerrado, paquete solo en cerrado, 3 historias con auto-cambio) + registro + botón en sección Flujos de cierre. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B21 — Diagrama Cierre quincenal especial (skill generar-diagrama) | ✅ 2026-10-09 | `cierre-quincenal.{md,html}` (6 nodos, modos Q1/Q2, cierro Q1/Q2 con auto-cambio + XML mensual común con gate) + registro + botón en sección Flujos de cierre. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B22 — Hoja firmable G9 + matriz ISLR (A+D, docs) | ✅ 2026-10-09 | `docs/anexos/hoja-firma-G9-ISLR.md`: opción A (adoptar serie provisional, sin migración) / B + convivencia + tabla conceptos/UT/mínimos/G2 con APROBADO/MODIFICAR + firmante/fecha; valores propuestos rotulados a cotejar. Checklist: propuesta sin valores activos, sin código, sin ADR (la firma futura entra como RDF) |
| B23 — Página Estado fiscal solo lectura (B) | ✅ 2026-10-09 | `/c/[id]/estado-fiscal`: RDF firmadas + G9 + reglas activas/sintéticas + dorados (desde DB/en sistema) y matriz/M-1…M-4/Q14/G1-G7 rotulados "expediente externo"; badge por gate + fuente visible; enlace a Decisiones. Checklist: typecheck 0 en página + lint 0; runtime pendiente de Neon; solo lectura (todos los roles), sin API nueva, sin ADR |
| B24 — Casos de Uso del contador validador | ✅ 2026-10-09 | Tercer grupo en `/casos-uso` (V-1…V-6: estado fiscal, G9, matriz, RDF, reglas, mes piloto) con pasos + ejemplo ficticio + pantalla; contador con typecheck 0 + lint 0; ejemplos ficticios, sin API nueva, sin ADR |
| B25 — Diagrama V-1 Estado fiscal (skill generar-diagrama) | ✅ 2026-10-09 | `v-1-estado-fiscal.{md,html}` (5 nodos, modos sistema/expediente, historias con auto-cambio + priorizo común) + registro + botón en tarjeta V-1. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B26 — Diagrama V-2 Firma G9 (skill generar-diagrama) | ✅ 2026-10-09 | `v-2-firma-g9.{md,html}` (5 nodos, modos opción A/B con swap de serie, historias con auto-cambio + emito común) + registro + botón en tarjeta V-2. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B27 — Diagrama V-3 Matriz ISLR (skill generar-diagrama) | ✅ 2026-10-09 | `v-3-matriz-islr.{md,html}` (5 nodos, modos borrador/firmada, historias con auto-cambio + activo común) + registro + botón en tarjeta V-3. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B28 — Diagrama V-4 Flujo RDF (skill generar-diagrama) | ✅ 2026-10-09 | `v-4-flujo-rdf.{md,html}` (5 nodos, modos preparo/firmo, historias con auto-cambio + sustituyo común; corregida clave `payloadFirmada`→`payloadFirmo`) + registro + botón en tarjeta V-4. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B29 — Diagrama V-5 Activar reglas (skill generar-diagrama) | ✅ 2026-10-09 | `v-5-activar-reglas.{md,html}` (5 nodos, modos sin/con cobertura con swap de gate, vinculo/rechazo con auto-cambio + activo común) + registro + botón en tarjeta V-5. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, swap verificado, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B30 — Diagrama V-6 Mes piloto (skill generar-diagrama) | ✅ 2026-10-09 | `v-6-mes-piloto.{md,html}` (5 nodos, modos comparo/acepta, historias con auto-cambio + firmo común) + registro + botón en tarjeta V-6. Hallazgo: `flow` duplicado en tarjeta R-E4 (línea 209) — eliminado, 20 `flow` únicos verificados. Checklist: validación del skill (0 `{{}}`, 6/6 pasos contra nodos, JS válido) + humo Playwright (3 flujos, captura) + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR |
| B31 — Marca BORRADOR en PDFs + corrida suites DB | ✅ 2026-10-09 | `render*CertificateHtml` aceptan `borrador` (banner + bump a v2) + `isBorrador()` fail-closed en `render-job` (sintética o sin cobertura firmada → banner) + `borrador.test.ts` 3/3. Neon volvió: suite completa 138/144 en DB real (islr-report 3/3, render IVA/ISLR, puras verdes). 6 fallos preexistentes/ambientales verificados en árbol limpio: 3 e2e (runner vitest vs playwright), workflow ACC-03 + goldens ×3 (drift), `rdf_series` sin RLS, `app_runtime` password vencido. Cero regresiones B1–B31. Sin API nueva, sin ADR |
| B32 — Sección amplia Decisiones en /docs (firma G9 y flujo RDF) | ✅ 2026-10-09 | `datos-base/decisiones`: 7 pasos clic a clic (bandeja→borrador→ficha→aprobar→firmar→vincular→activar) + 5 callouts (roles, ejemplo G9 A/B con efecto, fail-closed sin firma, dónde seguir, ruta). Checklist: typecheck 0 + lint 0; sin sensibles, sin API nueva, sin ADR |
| B33 — Pack sesión piloto (A ejecutable) | ✅ 2026-10-09 | `docs/anexos/sesion-piloto-convocatoria.md`: agenda 60–90 con salidas, checklist de sala y acta con APROBADO/MODIFICAR. Sin código |
| B34 — D rol app_runtime + RLS rdf_series | ✅ 2026-10-09 | Migración `0024_rdf_series_rls.sql` (RLS + `tenant_isolation`, rollback en cabecera; goldens reservadas pasan a 0025+, anotado en `DATABASE.md`) aplicada en Neon dev + `create-app-role.mjs` (rotó `app_runtime`, `.env` gitignored). Checklist: `drizzle-kit migrate` OK + catalog-invariant 1/1 + least-privilege 1/1 verdes en DB real. Sin API nueva, sin PII en logs, sin ADR (infra dentro de ADR-023) |
| B35 — D runner e2e + ACC-03 + goldens drift | ✅ 2026-10-09 | Vitest excluye `e2e/` (runner correcto: `npm run e2e`); ACC-03 en 2 ramas (NO_COVERAGE pura + NO_RDF en DB, orden documentado dorados→RDF); goldens al día con demo firmada (sign resetea copia, service refleja firmado, coverage=1). Checklist: workflow 3/3 + goldens 7/7 + suite `src` 139/139 en Neon real. Sin cambio semántico, sin ADR |
| B36 — Ficha layouts SENIAT XML/TXT (propuesta, sin código) | ✅ 2026-10-09 | `04-ficha-seniat-xml-txt.md`: XML (Forma 99074, Prov. 0095, fecha operación, validaciones, UT) + TXT (Forma 35, tabulaciones, prueba de carga, irreversibilidad, calendario quincenal) con qué pedir en Q14 y fuentes. Sin código hasta spec oficial |
| B37 — Buscador + filtro por estado en Casos de Uso + scroll del aside | ✅ 2026-10-09 | `casos-explorer.tsx` (cliente): texto (título/pasos/pantalla/ejemplo) + estado Disponible/Parcial/Requiere + conteo + vacío + limpiar; índice sincronizado (grupos vacíos se ocultan); aside con `max-h + overflow-y-auto` en desktop (vale para `/manual`). Checklist: typecheck 0 + lint 0; sin DB, sin API nueva, sin ADR |
| B38 — Email honesto al cliente (invitación al piloto) | ✅ 2026-10-09 | `blueprint/requerimiento/05-email-cliente.md` (qué probar, dónde orientarse, pendientes y reglas del piloto) + índice al día. Checklist: tono honesto verificado (nada vendido sin respaldo), sin código, sin ADR |

## Verificación QUINTA_REV — 2026-10-08 (código `7e355cb`, solo lectura)

> Contraste de `pendientes/QUINTA_REV/` (consolidado + roadmapRev5 + `taskIN/CONSOLIDADO-TASK.md` + `diff/index.md` + `decisiones/` + `seguimiento/tablero-semanal.md` edición 2026-10-07) contra el repo. Q-01…Q-08 y Q-10 cerradas 2026-10-08; Q-09⏳ entorno. Cierre terminal
de lo restante en `pendientes/QUINTA_REV/seguimiento/cierre-total.md` (acción + dueño + límite + plan B por pendiente).

### A — Sin dependencia externa (trabajo disponible esta semana)

| ID | Estado 2026-10-08 | Evidencia |
|---|---|---|
| Q-01 T14 Auth (P1) | ✅ cerrado 2026-10-08 | `ARCHITECTURE.md:25` → sesiones DB propias ADR-030 |
| Q-02 T14 pg-boss/mermaid/API (P1) | ✅ cerrado 2026-10-08 | Stack PDF + mermaid worker + despliegue + `API.md:163` → `render:retry`/ADR-031 |
| Q-03 DATABASE vs físico (P1/P3) | ✅ cerrado 2026-10-08 | B.1–B.4 + orden migraciones + § RDF implementada aplicados; P3 restante: `islr_withholdings` sin tabla propia (reportado por el script) |
| Q-04 script verificación doc↔schema | ✅ cerrado 2026-10-08 | `scripts/verify-docs-schema.ts` + `npm run docs:verify-schema` verde (0 P1; P3 islr + avisos post-snapshot 0022/0023) |
| Q-05 alícuota una escala (P2, bug latente) | ✅ cerrado 2026-10-08 | `RATE_SCALE_INVALID` en `fiscal-docs/service.ts` + `sales/service.ts`; formularios en fracción (`0.16`); `rate-scale.test.ts` 4/4; `API.md` documenta el código; 18 tests a `0.16` (DB no ejecutable aquí, ECONNRESET preexistente) |
| Q-06 higiene referencias | ✅ cerrada 2026-10-08 | `consolidado-2026-10-05 :198/:225` → `CONSOLIDADO-TASK.md`, §8 + header → ADR-001–034, `roadmapRev4 §20` con nota de obsolescencia (RDF en DB, tablero en QUINTA_REV). Restos en QUINTA_REV son diagnóstico histórico |
| Q-07 semilla dorados (nuestro) | ✅ cerrada 2026-10-08 | Tabla 17 filas en `CONSOLIDADO-TASK.md` (ID/caso/esperado/fuente/estado, `⛔` explícitos); ISLR-09 pendiente de verificación contador |
| Q-08 tablero semanal (T15) | ✅ 2ª edición 2026-10-08 | A1✅ A2✅, doc↔schema 7/7, spillover Q-09/T12/T13 explícito |
| Q-09 recorrido firma punta a punta | ⏳ no ejecutable aquí (Neon ECONNRESET) | Infra RDF verificada en código (`src/modules/rdf/`, `src/db/schema/rdf.ts`, `activation-gate.ts` con `GATE_NO_RDF`, UI `/decisiones`, migración 0023 en journal); dry-run con RDF descartable documentado en `CONSOLIDADO-TASK.md Q-09`, a ejecutar donde haya DB antes de la sesión |
| Q-10 E-3 (`origin`) | ✅ verificable para cierre | Reportado “no existe columna `origin`” en `consolidado §5`/`CONSOLIDADO-TASK Q-10`; coherente con `seed-company-rules --matrix-hash + synthetic` citado. Solo falta dejar la nota de cierre donde corresponda; se deja aquí como cerrada por verificación |
| T12 rotación secretos | 🔲 abierto | Runbook `incidente-serverc-2026-10-04.md §1+§3+§6` como registro (2 filas `pendiente` citadas en QUINTA_REV); sin evidencia de rotación ejecutada en este bloque |
| T13 rol mínimo + restore drill | 🔲 abierto | `create-app-role.mjs` + `DB_LEAST_PRIVILEGE` documentados (ADR-023); sin evidencia de staging con rol mínimo ni drill con RPO/RTO en este bloque |

### B — Dependencia externa (contador/cliente; sin avance registrado en código)

| ID | Estado 2026-10-08 | Nota |
|---|---|---|
| T01 F0-01 | 🧪 sin acuse | Enviado 2026-10-05; sin canal/acuse anotado |
| T02 M-1…M-4 (límite 16-oct) | 🧪 0/4 | Intake re-verificado 2026-10-08 sin DB: `import:autodetect` legacy 10/10 válido sin gatillo 1; `golden:inspect` XLSX inventariado 0 `#REF!`. Muestras reales sin recibir |
| T03 Sesión 1 | 🟡 6/11 pasos (sim 06-oct) | Faltan bloques 7 (ventas/NC/ND/Z con ADR-033), 9 (libros+Excel+conciliación con datos reales) y 11 (firma) |
| T04 matriz v1 (meta 06-nov) | ⛔ | `_manifest.matrizVersion="borrador-no-firmada"`; workflow ADR-022 listo, `GATE_NO_RDF` bloquea por diseño |
| T05 dorados 30–50 | ⛔ 0/30 | 1 fixture didáctico sin firmar; firma file-backed Opción 1 (`modules/goldens/sign.ts` + UI `/dorados` + `goldens.sign`, CHANGELOG 2026-10-07) no cambia el conteo: sigue 0 firmados; DB (0024–0027, Opción 2, ADR-035) pendiente |
| B1 7 RDF | 🔴 0/7 | Redactados (CUARTA_REV pools), ninguno `signed`; **paquete de sesión listo 2026-10-08** (`decisiones/paquete-sesion-1.md`: 7 casos con textos paso 1+2 + orden 60–90 min + checklist). Orden G8→G2→ADR-033→G9/G1/ISLR |
| B2 G4 | 🔲 ambiguo | `decisiones/decision-G4-alcance.md` recomienda A (diferir, 0 código) pero sin frase firmada; **frase lista en `paquete-sesion-1.md` §7** (A con blancos fecha/firmante); `TODO` aún lo lista como bloqueo F2 y ADR-013 sigue bloqueada sin nota de diferimiento |
| T06/T07/T08/T09/T10/T11 | ⛔ | Preparadas por ADR-034 (`g8:calibrate`, `g2:divergence`, `catalog:*`, `golden:inspect/compare`, `period-reconciliation`, UAT/manuales), bloqueadas tras firma |

### Gate de coherencia QUINTA_REV (roadmapRev5 §9) el 2026-10-08

- [x] A1 docs no contradicen código — **sí** (`docs:verify-schema` 0 P1)
- [x] A2 una sola escala de alícuota con test — **sí** (`RATE_SCALE_INVALID` + `rate-scale.test.ts` 4/4)
- [x] A3 cero rutas rotas — **sí** (Q-06 cerrada)
- [x] A4 tablero semanal con edición — **sí** (2ª edición 2026-10-08)
- [ ] B1 7 RDF con estado formal — **no** (0/7)
- [ ] B2 G4 decidido por escrito — **no** (recomendación A sin firma)
- [ ] B3 bloques 7/9/11 con evidencia — **no**
- Criterio final (1 spec=código · 2 firmadas · 3 dorados · 4 período real · 5 evidencia): **sí · no · no · no · parcial**. Fase 0 (sin dependencias) cerrada salvo Q-09⏳ entorno y T12/T13 servidor; B1/B2/T01–T11 esperan contador/cliente.

## Checklist por bloque
- [ ] Funciona + errores/casos límite + tests + sentido dominio
- [ ] API documentada si expone/consume + revisado SECURITY si toca sensibles + ADR si cambia rumbo

## Bloqueos activos
| Bloque | Motivo | Desde | Siguiente acción |
|---|---|---|---|
| T14/Q-01…Q-04 docs↔código | ✅ cerrado 2026-10-08 | Parches `diff §A–B` aplicados + `docs:verify-schema` verde (0 P1) | 2026-10-07 | — |
| Q-05 alícuota dos escalas | ✅ cerrado 2026-10-08 | `RATE_SCALE_INVALID` + formularios en fracción + test 4/4 | 2026-10-07 | Suites DB pendientes de entorno con Neon (ECONNRESET preexistente) |
| F2 redondeo | G8: cliente indica “8 cifras decimales significativas”; método, etapa y precisión final sin definir | 2026-10-01 | Aclarar método/etapa/precisión monetaria y recibir casos; solo después actualizar ADR-014 |
| F2 FX | Moneda base bolívares, referencia USD y fuente oficial BCV indicadas; fecha/tipo de tasa y diferencias cambiarias sin definir. **B2 2026-10-08**: `pendientes/QUINTA_REV/decisiones/decision-G4-alcance.md` recomienda A (diferir formalmente, 0 código) pero sin frase firmada | 2026-10-01 | Firmar A o B (una frase en `TODO` + nota ADR-013 con fecha/firmante); si A, sacar G4 de bloqueos go-live |
| F2/F4 abono en cuenta | Captura y comparación dual implementadas; `unset` por defecto y emisión fail-closed salvo convergencia estricta. Sin decisión del cliente sobre causación/fecha contable ni cálculo de parcialidades/sustraendo. IVA aún no usa eventos | 2026-10-01 | Revisar preview y firmar criterio/atribución por porción/sustraendo con contador; aprobar reglas y dorados antes de go-live |
| F4 ISLR y G9 | Asesoría/escenarios proponen tasas y serie sin firma; conceptos reales, UT, base con/sin IVA, mínimos, sustraendo parcial y numeración siguen sin validar. IVA tiene posible desajuste de reinicio por verificar | 2026-10-01 | Cotejo en fuente oficial + decisión contador; no parametrizar tasas ni cambiar secuencias antes de aprobar |
| F4 cuatro ojos | Asesoría propone aprobación separada y reglas especiales para anulaciones ya enteradas; matriz real de usuarios y política del cliente no confirmadas | 2026-10-01 | Aprobar matriz por empresa y decidir excepción si solo hay un usuario contador antes de implementar estados/aprobaciones |
| F0 golden candidates | 17 escenarios propuestos no validados; contrato de unidades cerrado 2026-10-04 (fracción + `base_gravable`, ENMIENDA v1.1 E-2); ISLR-09 ya corregido (base 900 → 306.00) a verificar con contador | 2026-10-01 | Alinear normalizador con tipos reales del motor, revisar a mano con contador y firmar antes de mover a fixtures ejecutables |
| SEG incidente `serverc` | Clave SSH privada commiteada en `7c70dbe` y presente en `origin/main`; `.gitignore` no la cubre | 2026-10-04 | ADR-029 + runbook `incidente-serverc-2026-10-04.md`: rotar en servidor → rotar secretos → purge + force-push → escáner. H0 bloqueado hasta purge verificado. **2026-10-04 (ADR-032, orden del dueño): bloqueo `serverc` removido del escáner para commitear; purge mañana. Escáner ciego ante `serverc` hasta entonces** |
| F2/F3 | XLSX disponible pero no validado; cuestionario no confirma CSV/Z reales; G7 solo precisa “por sucursal” | 2026-10-01 | Cotejar golden y confirmar fuente del Libro de Ventas, período y archivos reales |
| F0 roles | Cuestionario/asesoría proponen controles genéricos y cuatro ojos, sin aprobación ni matriz de responsabilidades | 2026-10-01 | Obtener matriz de quién prepara, revisa, aprueba, emite, anula y reemite; confirmar viabilidad del control |
| F0 | Matriz + dorados pendientes | 2026-09-30 | Sesión semanal contador |

## Backlog v2 (no construir)
Factura electrónica (`electronically_issued`), portal supplier, correo (pg-boss lista), API adaptadores, OCR por staging, calendario/alertas.

## Dashboard ?company (2026-10-04)
| Bloque | Estado | Notas |
|---|---|---|
| UX dashboard empresa | ✅ | `dashboard/page.tsx`: períodos vía `listPeriods` (ctx trae máx. 5 sin orden); nav acotada a últimos 8 + enlace a Períodos; estados es-VE (`periodStatusVe`); tarjeta muestra abierto Vigente o último; 8 indicadores clicables a drill-down; actividad solo empresa seleccionada (`listAuditEvents` + `limit: 8`, antes N×500); CTA "Listo para revisión" solo contador conciliado sin hallazgos; vacíos en gráficos. `QuickActions` con `canWrite` (administrativo/contador; resto ve "Ver resumen"). `AuditFilter.limit` opcional (defecto 500, compatible). Rev2: `CompanySwitch` (botón empresa actual + diálogo `w-[90%]` con lista seleccionable: logo/inicial, RIF, condición, rol y período; reemplaza pills). Checklist: build+typecheck+lint verdes, audit tests 2/2 con env, sin API nueva, sin ADR nuevo |
| Bloque | Estado | Notas |
|---|---|---|
| Síntesis landing para contador | ✅ | `src/app/landing-content.tsx`: hero "tú firmas, auxiliar prepara"; quitados `100%`/`12/12`/`≤3 clics` como logros; ejemplo N° 202609-000128 etiquetado ficticio; paso emisión corregido a ADR-027 (TX número+snapshot+audit, PDF post-commit); conciliación provisional 0,01 hasta G8; numeración limitada a IVA hasta G9; prueba/go-live como gate con estado `0/30–50` firmados. Rev2 2026-10-04: el auxiliar es el sistema (no una persona); "resumen como insumo para tu declaración" según DOMAIN; fix `/docs/comprobantes/islr` (serie G9 pendiente, PDF sigue patrón IVA). Checklist: funciona (typecheck por verificar), sin API nueva, sin sensibles, sin ADR nuevo |

---
Ver también: `README.md`, `PROJECT.md`, `DECISIONS.md`, `CHANGELOG.md`, `anexos/checklist-F0.md`. Estándar header docs: `Estado / Actualizado / Dueño / Fuentes`.
