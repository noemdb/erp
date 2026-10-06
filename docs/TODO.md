# TODO.md — ERP-TributarioLite

> Fuente de verdad del estado técnico y documental. F1–F6 están implementadas parcial o mayormente; faltan gates fiscales y validación operativa. Un bloque es ✅ solo con checklist Paso 04 completo. Roadmap base: `blueprint/ROADMAP-ERP-TributarioLite.md` F0–F7.

## Leyenda
- 🔲 Por hacer — 🧪 En pruebas — ✅ Hecho — ⛔ Bloqueado

## Estado docs (v0.1 propuesta)

| Doc | Estado | Nota |
|---|---|---|
| `ARCHITECTURE.md` | ✅ | Unificado a PG ≥16 + Drizzle |
| `DOMAIN.md` | ✅ | Glosario, invariantes, estados |
| `DATABASE.md` | ✅ | Schema + pendientes de definición, ahora incluye G2 abono en cuenta |
| `API.md` | ✅ | Contrato actualizado; varias operaciones siguen pendientes |
| `SECURITY.md` | ✅ | Regenerado RBAC rol×empresa |
| `CONVENTIONS.md` | ✅ | Regenerado |
| `DECISIONS.md` | ✅ | ADR-001–031 (013/014 bloqueados; 018–020 propuestos; 008 diferida por 031; 021–031 aceptadas) |
| `PROJECT.md` | ✅ | Elevator pitch, alcance y métricas definidos |
| Cuestionario PDF vs G1–G12 | ✅ | Contrastado, ver ROADMAP §3/§11 |
| `anexos/` (matriz generada, RDF, diferimiento, roles, bitácora) | ✅ parcial | Plantillas e infra listas; falta matriz v1 + dorados firmados |

## Plan por fases

### F0 — Línea base fiscal (requiere contador)
| Bloque | Estado | Notas |
|---|---|---|
| Paquete contador (`anexos/paquete-contador.md`) | ✅ | Enviable: matriz preliminar + checklist + preguntas; 17 escenarios candidatos no aprobados ni ejecutables como dorados. **F0-01 enviado 2026-10-05**: carátula `anexos/pedido-F0-01.md` (18 preguntas asesoría §9 + 5 formato ROADMAP-03 §3.7 + post-cierre + piloto/tiempos + M-1…M-4). Pendiente: anotar canal/acuse y respuesta del contador |
| Matriz Reglas v1 firmada | 🔲 | Borrador legal IVA iniciado; falta cotejo/firma y completar ISLR por concepto |
| Escenarios dorados 30–50 | 🔲 | `pendientes/PRIMERA_REV/dorados-propuestos-F0.json` contiene candidatos no validados; no son fixtures ejecutables ni gate aprobado. Faltan escenarios firmados por contador. |
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
| `computeDocumentTaxes` puro + dorados IVA 100% + property | 🔲 | Motor listo; gate: sin matriz v1 + 30–50 dorados del contador no se cierra F2 |

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

## Checklist por bloque
- [ ] Funciona + errores/casos límite + tests + sentido dominio
- [ ] API documentada si expone/consume + revisado SECURITY si toca sensibles + ADR si cambia rumbo

## Bloqueos activos
| Bloque | Motivo | Desde | Siguiente acción |
|---|---|---|---|
| F2 redondeo | G8: cliente indica “8 cifras decimales significativas”; método, etapa y precisión final sin definir | 2026-10-01 | Aclarar método/etapa/precisión monetaria y recibir casos; solo después actualizar ADR-014 |
| F2 FX | Moneda base bolívares, referencia USD y fuente oficial BCV indicadas; fecha/tipo de tasa y diferencias cambiarias sin definir | 2026-10-01 | Definir fecha y tipo de tasa BCV, diferencias y ejemplos; después resolver ADR-013 |
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
