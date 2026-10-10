# CHANGELOG docs/

- 2026-10-10: **B14** mejoras `/configuracion` (4 elegidas): panel de estado (tamaño + conteos + historial JSONL sin PII) + backup con sha256/tablas en headers y botón copiar + restore con copia previa fail-closed en `/storage/.safety` y checklist `restore-check` + limpieza con simulacro y alcance por empresa (poda de huérfanos). Checklist: typecheck 0 + lint 0 + puras 13/13 + boundaries 0 nuevas; integración DB pendiente de Neon. Sin permiso nuevo, sin ADR (extiende ADR-037).

- 2026-10-10: **B13** R-E4 correlativo quincenal (contenido + diagrama `r-e4-correlativo` + detector de huecos + cruce contra serie): retoques tarjeta R-E4, diagrama validado (0 `{{}}`, nodos 5/5, JS_OK, humo 3 flujos + captura), `correlativo-gaps.ts` puro 7/7 + endpoint + KPI Secuencia en bandejas + `API.md` al día. Checklist: typecheck 0 + lint 0 + boundaries 0 nuevas; integración DB pendiente de Neon. Sin permiso nuevo, sin ADR.

- 2026-10-09: **B12** sección Configuración admin (ADR-037): `/configuracion` + item en menú + `modules/maintenance` (backup `pg_dump` / restore `psql` todo o nada / limpieza total con preservados) + `API.md`/`SECURITY.md`/`TODO.md` al día. Checklist: typecheck 0 + lint 0 + puras 8/8 + boundaries 0 nuevas; integración DB pendiente de Neon. Sin permiso nuevo (`users.manage` reutilizado).
- 2026-10-09: **B12-fix** `BACKUP_VERSION_MISMATCH` (servidor PG 18.6 vs pg_dump 16 del sistema): `resolvePgBin` autodetecta el cliente más nuevo (`PG_DUMP_PATH`/`PSQL_PATH` → `/usr/lib/postgresql/*` → `~/.local/pg18/bin` → PATH) + código de error accionable; cliente 18 PGDG en espacio de usuario (sin root) y backup real verificado contra Neon (173 KB, `Dumped by pg_dump 18.6`). Checklist: typecheck 0 + lint 0 + puras 9/9. `.env.example` documenta `PG_DUMP_PATH`/`PSQL_PATH` para staging/prod.

- 2026-10-09: **B37** buscador + filtro + scroll en Casos de Uso. Checklist: typecheck 0 + lint 0. Sin DB, sin API nueva, sin ADR.

- 2026-10-09: **B38** email honesto al cliente + **B37** buscador/filtro/scroll en Casos de Uso. Checklist: typecheck 0 + lint 0. Sin DB, sin API nueva, sin ADR.

- 2026-10-09: **B33–B36** A+D: pack sesión piloto, D técnico (migración 0024 + rol mínimo + runner e2e + gates al día, suite `src` 139/139 en Neon) y ficha SENIAT XML/TXT como propuesta. Checklist: migraciones OK + suites verdes + typecheck/lint en tocados. Sin ADR.

- 2026-10-09: **B32** sección amplia Decisiones en `/docs` (ruta clic a clic + G9 A/B + cobertura + fail-closed). Checklist: typecheck 0 + lint 0. Sin API nueva, sin ADR.

- 2026-10-09: **B31** marca BORRADOR fail-closed en PDFs + primera corrida completa en Neon real (138/144; 6 fallos preexistentes documentados). Checklist: typecheck 0 + lint 0 + puras 3/3 + integración B2/B31 verdes en DB. Sin API nueva, sin ADR.

- 2026-10-09: **B30** diagrama V-6 (skill generar-diagrama; último de la serie V). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B29** diagrama V-5 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B28** diagrama V-4 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B27** diagrama V-3 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B26** diagrama V-2 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B25** diagrama V-1 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B22–B24** recomendación A+B+D: hoja firmable G9+matriz (`docs/anexos/hoja-firma-G9-ISLR.md`), página `/c/[id]/estado-fiscal` (gates DB + expediente, solo lectura, enlace en panel) y grupo Contador validador V-1…V-6 en `/casos-uso`. Checklist: typecheck 0 + lint 0 en tocados (aviso img preexistente en dashboard). Sin API nueva, sin ADR.

- 2026-10-09: **B21** diagrama Cierre quincenal (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B20** diagrama Cierre mensual (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B19** diagrama R-E8 (skill generar-diagrama; proceso diseñado con gate Q14 visible, sin código). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B18** diagrama R-E7 (skill generar-diagrama; proceso diseñado con gate Q14 visible, sin código). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B17** diagrama R-E6 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B16** diagrama R-E5 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B15** diagrama R-E4 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B14** diagrama R-E3 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B13** diagrama R-E2 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B12** diagrama R-E1 (skill generar-diagrama). Checklist: validación del skill + humo + captura + lint 0 + tsc 0 en tocados. Sin API nueva, sin ADR.

- 2026-10-09: **B11** diagrama R-O4 (skill generar-diagrama; proceso diseñado con gate Q14 visible, sin código). Checklist: validación del skill + humo + captura + typecheck 0 + lint 0. Sin API nueva, sin ADR.

- 2026-10-09: **B10** diagrama R-O3 (skill generar-diagrama). Checklist: validación del skill + humo + captura + typecheck 0 + lint 0. Sin API nueva, sin ADR.

- 2026-10-09: **B9** diagrama R-O2 (skill generar-diagrama; fix de `data-*-online` con guion aplicado a R-O1 también). Checklist: validación del skill + humo + captura + typecheck 0 + lint 0. Sin API nueva, sin ADR.

- 2026-10-09: **B8** pantalla completa real en diagramas (Fullscreen API + `allowFullScreen` en el diálogo; parche en 17 html + plantilla del skill). Checklist: humo standalone + iframe + captura + typecheck 0 + lint 0. Sin API nueva, sin ADR.

- 2026-10-09: **B7** diagrama R-O1 (flujo interactivo `r-o1-libro-compras` + `.md`, registro en `_flows.tsx`, botón en tarjeta R-O1). Checklist: typecheck 0 + lint 0 + captura sin errores JS. Sin API nueva, sin ADR.

- 2026-10-09: **B6** sección Casos de Uso: item en menú + `/casos-uso` con los 12 casos (R-O1…R-E8, descripción + pasos + ejemplo ficticio + pantalla + estado) espejo de `/manual` + flujos de cierre. Checklist: typecheck 0 + lint 0; sin PII, sin API nueva, sin ADR.

- 2026-10-09: **B5** botón Congelar paquete (cierra loop B3): `PeriodButtons` en under_review/closed dispara `freezeClosingPackageAction` y muestra versión+sha. Checklist: typecheck 0 + lint 0; runtime pendiente de Neon. Sin API nueva, sin ADR.

- 2026-10-09: **B3** paquete de cierre (R5): `closing-package.ts` + ruta `GET .../reports/closing-package` + `freezeClosingPackageAction` + CTA en período + test (3 puras) + `API.md`/`DATABASE.md` al día. Checklist: typecheck 0 + lint 0 + puras 3/3 + `docs:verify-schema` sin P1 + `boundaries` 0 nuevas (72 preexistentes). Sin permiso nuevo, sin ADR.

- 2026-10-09: **B2** correlativo ISLR en CSV (R-E4, espejo del IVA): `getIslrWithholdingsReport`/`toIslrWithholdingsCsv` en `issue-islr.ts` + ruta `GET .../reports/islr-withholdings` + CTA en bandeja + `islr-report.test.ts` + `API.md` al día. Checklist: typecheck 0 + lint 0 + puras 2/2; integración pendiente de Neon. Sin permiso nuevo, sin ADR.

- 2026-10-09: Roadmap R0–R5 (`blueprint/requerimiento/` README + 01 + 02) + inicio de ejecución ordenada: sección `TODO.md` “Roadmap R0–R5 — ejecución” (B1✅/B2🔲/B3🔲/B4⛔) y **B1** endurecimiento `src/db/client.ts` (singleton `globalThis` dev + `connect_timeout:15`/`idle_timeout:20`/`max_lifetime:600`; `prepare:false` intacto). Checklist: typecheck 0 nuevos + lint 0 + import singleton OK + puras 8/8 con env. Sin API nueva, sin ADR.

- 2026-10-08: Cierre total QUINTA_REV: Q-04 al pre-commit (`scripts/hooks/pre-commit` ejecuta `docs:verify-schema` fail-closed, verificado verde) + `seguimiento/cierre-total.md` (acción terminal + dueño + límite + plan B para Q-09/T12/T13/T01/T02/B1/B2/T03–T11/commits, con 3 cartas listas: sesión, reclamo M-1…M-4, G4 por defecto del dueño). Sin servidor accesible desde aquí (T12/T13) ni DB (Q-09/carga). Orden de commits GIT-01 pendiente del dueño.

- 2026-10-08: T02 intake re-verificado sin DB (`autodetect` legacy 10/10 sin gatillo 1; `golden:inspect` XLSX 0 `#REF!`); cita `GATE_NO_RDF` corregida a `rules/service.ts:87` (`activation-gate.ts:57` + test `:131` confirmados). DB Neon sigue inalcanzable desde aquí (Q-09 y carga de borradores pendientes de entorno con DB).

- 2026-10-08: Fase 1 (paquete de sesión): `pendientes/QUINTA_REV/decisiones/paquete-sesion-1.md` (7 RDF con textos paso 1+2, orden 60–90 min, checklist y Fase 2; corrige pool: añade ADR-033 con cifra NC 001-00004, saca G4 como RDF, todo como propuesta sin pre-acuerdo) + avisos ⚠️ en ambos pools CUARTA_REV. Hallazgo: pool paso 2 presentaba "acordado/verificada" sin firma (0/7). `npm run build` verde con cambios Q-05.

- 2026-10-08: Fase 0 (0.1–0.5). Q-06: `CUARTA_REV/consolidado :198/:225` → `CONSOLIDADO-TASK.md`, ADR-001–034, nota de obsolescencia en `roadmapRev4 §20`. B.5: `islr_withholdings/lines` con tabla propia en `DATABASE.md` → `docs:verify-schema` 7/7 sin P1 ni P3. Q-07: tabla 17 dorados completa en `CONSOLIDADO-TASK.md`. Q-09: dry-run documentado, bloqueado por entorno (Neon ECONNRESET también en árbol limpio). Q-08: tablero 2ª edición. Gate §9: A1✅ A2✅ A3✅ A4✅ B1❌ B2❌ B3❌.

- 2026-10-08: QUINTA_REV Q-01/Q-02 (T14 docs): `ARCHITECTURE.md` auth → sesiones DB propias ADR-030; stack PDF + mermaid worker + despliegue → `render:retry`/ADR-031; `API.md:163` igual. Checklist: `docs:verify-schema` no aplica (docs), typecheck verde, lint 0 errores.
- 2026-10-08: QUINTA_REV Q-03 (DATABASE vs físico): `purchase_documents` sin `branch_id/fx_rate/fx_rate_date/voided_at/void_reason/replaces_id/attachments_count` (nota ADR-033/G4); `payments` sin `voided_at/void_reason`; `attachments` a `mime/storage_key/created_by/created_at + sha256/status/void_reason`; `companies` branding + `sales_mode` + timestamps; `withholding_rules` aprobación + `source_decision_id`; `render_status` IVA/ISLR; orden migraciones hasta 0023; § RDF como implementada. Resta P3: `islr_withholdings` sin tabla propia.
- 2026-10-08: QUINTA_REV Q-04: `scripts/verify-docs-schema.ts` + `npm run docs:verify-schema` (snapshot vs `DATABASE.md`, 7 tablas críticas, exit 1 ante P1; avisa lag snapshot 0021/journal 0023 y P3 islr). Verde: 0 P1.
- 2026-10-08: QUINTA_REV Q-05 (alícuota una escala, ENMIENDA E-2): `fiscal-docs/service.ts` + `sales/service.ts` rechazan `>1` con `RATE_SCALE_INVALID` (mensaje `0.16`); formularios compra/venta en fracción (defecto/placeholder `0.16`, venta calcula `b*a`); `API.md` documenta el código; `rate-scale.test.ts` 4/4 verde; 18 tests a `0.16`. Puras 22/22 + typecheck + lint 0 errores verdes. Suites DB no ejecutables aquí (Neon ECONNRESET preexistente, verificado en árbol limpio).

- 2026-10-08: Verificación QUINTA_REV contra código `7e355cb` (solo docs, sin código): `TODO.md` suma § “Verificación QUINTA_REV — 2026-10-08” (Q-01…Q-10 + T12/T13 + B1/B2 con evidencia archivo:línea) y 2 filas de bloqueo sin dependencia externa (T14/Q-01…Q-04, Q-05); filas `ARCHITECTURE/DATABASE` pasan a 🧪 y `API` a ✅ parcial; `computeDocumentTaxes` y FX anotan Q-05/B2. Resultado: ningún Q cerrado en código (Q-10 cerrable por verificación ya anotada); gate de coherencia roadmapRev5 §9 sigue 0/7 (A1 no, A2 no, A3 no, A4 parcial, B1 no, B2 no, B3 no). Parches siguen en `pendientes/QUINTA_REV/diff/index.md` sin aplicar.

- 2026-10-07: Spec de firma de dorados `blueprint/goldenValidation/` (README + 01-spec + 02-modelo + 03-api-ux + 04-tests-rollout, propuesta sin ADR-035/036 ni migración): mecanismo para que el contador firme los 30 dorados del gate go-live (hoy 0), reutilizando el patrón RDF (ADR-034). Detecta D1–D10 (firma falsificable, `firmado_por` texto libre, `goldens:check` con dorados sin firma, sin inmutabilidad/auditoría/RBAC, canónicos duplicados, 5/17 candidatos no ejecutables, 2 que prueban reglas no implementadas) y escala al contador la elección de firma (§7) y el origen real de go-live (RG-10). **Fase 0.1–0.4 implementadas**: 0.1 `engine.test.ts` soporta `ivaEsperado.noAplica` (cierra D6); 0.2 canónico único en `src/modules/shared/canonical.ts` (cierra D9; `rdf`, `activation-gate` y `scripts/validate-goldens` migran; `goldens:check` pasa a `node --import tsx`); 0.3 `schema.json` con `estado` obligatorio, `esperado` tipado, `ivaEsperado.noAplica` y `taxRate` como fracción, con `IVA-01` a `CANDIDATO` (cierra D3); 0.4 `FraccionSchema`/`MoneySchema` en `src/modules/shared/schemas.ts`, aplicados al borde de captura (`rules/service.ts` `porcentaje`). **Fase 3+4 parciales (file-backed, sin DB)**: módulo `src/modules/goldens/` (`verify.ts`, `service.ts`, `sign.ts` Opción 1, `actions.ts`, `labels.ts`) y UI `/c/[companyId]/dorados` (bandeja + ficha + **dialog de firma**) + enlace en panel/drawer; `scripts/validate-goldens.mjs` reutiliza `verifyGolden`; permiso `goldens.sign` (contador) en `authorize.ts`. **Firma provisional (Opción 1)**: `signGoldenCase` escribe `estado=VALIDADO_CONTADOR` + `firma` (usuario de sesión, `hmac-sha256`, hash, fecha, evidencia) en el archivo, con RG-02/RG-03; verificable por `verifyGolden`. **Fuera de este bloque (gated por ADR-035)**: migraciones 0024-0027 (`golden_cases`/`golden_signatures`/trigger/RLS), firma con llave propia Ed25519 (Opción 2), `goldens:export`/`verify` en DB, y el respaldo del gate en DB. Sin commit.

- 2026-10-07: Gestión de usuarios en dropdown (solo admin): helper `canManageUsersAnywhere` (misma regla que `/usuarios`) propagado a `AppHeader`/`UserMenu` y a dashboard, manual y docs; en empresa vale rol admin actual. Sin API nueva. Sin commit.

- 2026-10-07: Manual de Usuario por rol (`/manual`: contador/administrativo/auditor/admin con pasos y decisiones) + opción en el dropdown de usuario junto a Documentación (visible a todos los roles); `docs/manuales/` al día (contador con decisiones, nuevo `auditor.md`). Sin API nueva. Sin commit.

- 2026-10-06: RDF implementado (ADR-034 aceptada): migración 0023 (`fiscal_decisions` + links + `rdf_series` + `source_decision_id`, RLS + trigger `rdf_immutable`) aplicada en Neon dev; módulo `src/modules/rdf/` (service/links/canonical/csv/actions/labels) + gate `GATE_NO_RDF` en `activateRule` (dorados primero, luego cobertura; sintéticas exentas); UI `/c/[id]/decisiones` (bandeja/nueva/detalle) + nav + ayuda `/docs/datos-base/decisiones` + export CSV `GET .../decisiones`; tests rdf+rules 16/16 (flujo firma+sha256, inmutabilidad app+trigger, fuga cross-empresa, 10 códigos concurrentes, gate con vínculo→applied) + typecheck + lint 0 errores + build verdes. Nota: `create-app-role.mjs` tiene default privileges, las tablas nuevas quedan cubiertas al re-ejecutarlo. Sin commit.

- 2026-10-06: Spec RDF en sistema + asociación a regla (`blueprint/rdf/` README + 01-spec + 02-modelo + 03-api-ux + 04-tests-rollout, ADR-034 propuesta): entidad `fiscal_decisions` inmutable tras firma + puente `fiscal_decision_links` + `source_decision_id` + gate `GATE_NO_RDF` en activación. Docs al día: `DOMAIN` (término + entidad planificada), `DATABASE` (tablas planificadas sin migrar), `API` (acciones + código `GATE_NO_RDF`), `SECURITY` (RBAC RDF), `DECISIONS` (ADR-034), `TODO` (bloque 🔲), `anexos/RDF-plantilla` (nota de vigencia). Sin migración ni código hasta aceptación. Sin commit.

- 2026-10-06: Caso práctico sim #2 en `/docs` (sección 5 `Caso práctico`, 4 páginas resumen/carga/comprobacion/cierre): pasos en 2 columnas guía/práctica con cifras reales (lote 10/0/9/1, NC 001-00004, pago 1.500→004-00099, preview IVA 1.179,12, ISLR 6/6 bloqueado), sin tecnicismos ni URLs, índice+sidebar cableados desde `content.ts`. Retro sim #2 en `retrospectiva-sim2.md`. Typecheck+lint+build verdes. Sin commit.

- 2026-10-06: Nomenclatura `blueprint/datos/casoUso003` a kebab-case sin acentos (CONVENTIONS Archivos): `guia-simulacion-maria.md`, `compras-septiembre-legacy.csv` (`git mv`, historial conservado), `escenario-02-revision-estado-real.md`, `compras-septiembre-2025-rerun.csv`, `guia-rerun-limpio.md`, `retrospectiva-casoUso003.md`, `limpieza-casoUso003.sql` (sin cambio); eliminado el blob truncado `…María (Adm` (contenido idéntico al renombrado); refs internas actualizadas. Sin commit.

- 2026-10-06: `sim:limpieza-caso003` en `package.json`: corre `limpieza-casoUso003.sql` con `DATABASE_MIGRATION_URL` (rol migrador, falla si falta) y `company` fija a la demo. Sin commit.

- 2026-10-06: Retrospectiva + kit rerun casoUso003 (doc-only, sin commit): `RETROSPECTIVA-casoUso003.md` (11 hallazgos), `limpieza-casoUso003.sql` (rol migrador, orden hijas→padres, config a pre-sim, verificación todo-0), `compras_rerun_v2.csv` (año 2025 por regla seed `[2025-01-01)`; resto idéntico para re-demostrar rechazo NC/aviso G2/alias), `GUIA-rerun-limpio.md` (orden: intake → NC manual → evento+asignación → agente+perfiles → previews sin emitir). Sin ejecución en BD ni cambios de código.

- 2026-10-05: Cierre María casoUso003 + pase Carlos (solo preview) + ADR-033 propuesta: guía estado-real con addendum (ND 716917eb→voided, NC 6acc6ce7 2023-09-10/11/10) y §6 Esc.4 (bitácora: upload/confirm/create/void, export CSV, timeline lote/fila) + preview IVA (excluir NC 001-00004 a mano; emisión bloqueada por F0/signo) + preview ISLR dual (fila 5 sin evento; criterio `unset`, sin emitir ni configurar). ADR-033: NC resta en libro/resumen/conciliación + elegibles solo facturas; migración aditiva `voided_at/void_reason/replaces_id`; sin código hasta firma. Libros/resumen provisionales, cierre bloqueado. Sin commit.

- 2026-10-05: Anulación compras + corrección NC 001-00004 (fila 9 lote f785fdcc): `voidPurchaseDocument` (motivo≥3, `validated|included→voided`, audit en TX, trigger mapea PERIOD_CLOSED) + `voidPurchaseAction` (`docs.create`) + UI Anulación en detalle + `getPurchaseBook`/`getIvaSummary`/`getConciliation` excluyen `voided`. Datos dev: ND 716917eb→`voided`, NC `credit_note` 001-00004/12348 afectado 001-00001 fechas 2023-09-10/11/10 (actor contador). 10 activos (9F+1NC). Suites fiscal-docs/reporting/imports 25/25 + typecheck + lint (0 errores) verdes. Deuda intacta: signo NC en agregados (requiere ADR). Sin commit.

- 2026-10-05: Importación F3-4: alias legacy `monto_iva/total_factura/nombre_proveedor` + avisos explícitos (`tipo_doc`≠F rechazado, `abono≠0` warning con evento G2 manual, `alicuota_iva/fecha_recepcion` en `ignoredColumns` + nota UI, columna Errores/avisos). CSV `casoUso003` normalizado a canónicas; validación real 10 filas (9 avisos + 1 NC rechazada). Suite imports 7/7 + typecheck/lint verdes. Sin commit.

- 2026-10-05: Intake M-1…M-4 listo para muestras reales: `import:autodetect` corre sobre corpus sintético (compras-legacy 80% válido; Z dispara gatillo 1 → perfiles FUN-05 pendientes de layouts reales) y `golden:inspect` inventaría el XLSX de formatos (0 `#REF!`). Gate de entrada operativo; a la espera del envío del contador (límite 16-oct).

- 2026-10-05: F0-01 enviado (carátula `docs/anexos/pedido-F0-01.md`): 18 preguntas asesoría F0 §9 + 5 formato ROADMAP-03 §3.7 + post-cierre + piloto/tiempos + M-1…M-4 (límite muestras 16-oct). Cumple Enmienda E-4 (límite 05-oct). Pendiente canal/acuse.

- 2026-10-05: SEC-02′ cerrado post-purge: `scan-secrets.mjs` vuelve a bloquear `serverc*` (fin ceguera ADR-032) + hook pre-commit instalado; triple verificación limpia (scan, historial, trackeados). GIT-01 rebanada commiteada.

- 2026-10-04: ADR-032 (orden del dueño): `serverc*` excluido del escáner de secretos (pre-commit + CI); commits desbloqueados, purge SEC-04 mañana. Escáner ciego ante `serverc` hasta entonces; resto de patrones intacto.

- 2026-10-04: Dashboard `?company` UX: períodos completos vía servicio, nav acotada 8, estados es-VE, indicadores clicables a drill-down, actividad por empresa con `limit`, CTA de cierre para contador, `QuickActions` con gating por rol, vacíos en gráficos. Build+typecheck+lint verdes.

- 2026-10-04: ACC-05 arnés Playwright (`@playwright/test` 1.63 + `playwright.config.ts` con webServer dev, 1 worker por rate-limit/DB compartida): `e2e/seed.ts` idempotente (4 roles en empresa demo, clave por `E2E_PASSWORD`), `auth.setup.ts` con login UI real + storageState por rol, `helpers.conReloj` (reloj controlado), humo login/dashboard por rol + negativa (6/6 verde local). Hallazgos: `seed.ts` ejecutaba `main()` al importarse (mataba el worker; guardia de ejecución directa), `getByLabel('Contraseña')` colisiona con el toggle (rol textbox), y baseURL debe ser `localhost` (el dev bloquea 127.0.0.1 en HMR/Flight y el login caía a GET con la clave en la URL). CI con browsers + `e2e:seed`/`e2e` (requiere secreto `E2E_PASSWORD`). Recorridos P0 en ACC-06. Typecheck verde, lint 0 errores. Sin commit.

- 2026-10-04: REP-01 alcance de render (`docs/anexos/matriz-render-v1.md`): `renderIslrCertificateHtml` (`islr-certificate/v1`) + `renderIslrPdf` post-commit idempotente con adjunto/auditoría + `renderIslrPdfAction`; `renderSalesBookHtml` (`sales-book/v1`, fila Z con identidad); `listPendingRenders` unificado IVA+ISLR con `kind` y `render:retry` despacha por clase. Tests: `render-islr.test.ts` (pending→done→negado) + determinismo/escape en `evidence.test.ts`. Fuera con motivo: Excel sobre plantilla (tras formato aprobado), PDF de libros/resumen (sin snapshot archivado), `summary` sin versión, `pdf_sha256` en ISLR (sha en adjunto+auditoría), tablero de pendientes en UI, paridad art. 16 (REP-03 con contador). Typecheck verde, lint 0 errores. Sin commit.

- 2026-10-04: Guía `pendientes/TERCERA_REV/guia/` (README + 02-ruta-externa + 03-ingenieria-posterior): detalle operativo de muestras→Sesión 1→matriz→dorados (dueños, aceptaciones, plan B) y de la ingeniería posterior (precondiciones, aceptación, orden, tablero semanal).

- 2026-10-04: ACC-06 P0 E2E (14/14 verde local): `p0.journeys` (J1 compra contador con RIF/factura únicos por corrida → visible en lista; J2 CSV→lote validado con advertencia honesta de tercero nuevo, sin confirmar; J3 reglas: auditor solo-lectura, contador ve borrador) + `p0.security` (S1 cross-tenant→dashboard con Empresa E2E-B sin membresías; S2 API 401 y página→login sin sesión; S3 rate-limit al 6.º intento). Seed escribe `e2e/.ctx.json` (ignorado). Hallazgos: `import.meta` no existe en el transform CJS de Playwright (`process.cwd()`); inputs del formulario de compra sin `id` (labels rotos, deuda a11y menor); el lote nace en `uploaded` (hay que pulsar Validar filas). Escrituras marcadas E2E- en dev. Typecheck verde, lint 0 errores nuevos. Sin commit.

- 2026-10-04: ACC-03 gate de activación (`src/modules/rules/activation-gate.ts` + `transition()`): lo no sintético solo activa si reproduce el 100% de sus firmados (`GATE_NO_COVERAGE` sin cobertura, `GATE_FAILED` con diffs); sintético omite (guardia prod intacta). Verificado puro (7 tests), servicio (bloqueo + workflow sintético) y e2e temporal con firmado real en disco (ruta positiva pasa; hash manipulado ⇒ NO_COVERAGE). `workflow.test` marca sus datos synthetic; seeder autorizado deja aprobada-pendiente ante GATE_*. Procedimiento de firma en `fixtures/tax-scenarios/README.md`. Suites afectadas 20/20, typecheck verde, lint 0 errores. Sin commit.

> Convención (DOC-04): cada entrada lleva fecha; las cifras de tests
> (p. ej. "49 tests", "73/73") son **snapshot de su fecha**, no estado actual.
> El estado vigente vive en `docs/TODO.md` y `acceptance/test-results/`.

- 2026-10-04: H0 ejecutable (sin dependencias externas). SEC-02: `.gitignore` con bloque de secretos (`serverc*`, `*.key`, `id_*`, volcados), `secrets:scan` ampliado (nombres riesgosos sin extensión + material trackeado + cobertura `.gitignore`; falla con `serverc` presente por diseño) y hook pre-commit versionado instalado (bloquea hasta el purge). TST-01: `least-privilege` con skip documentado y error accionable (suite 72/73 con `.env` cargado; el rojo es la clave `app_runtime` de este entorno, pendiente SEC-03). GIT-02: `seed:company-rules` sintético por defecto, rechazo en prod sin `--matrix-hash` verificado contra la matriz, rutas probadas. DOC-01…05: fila F4 (emisión IVA+ISLR), CONVENTIONS (17 módulos, tests junto al código, ADR-027), DECISIONS en orden + ADR-030 (ratifica 001/002/004/006/007/010/011/012, parciales 003/005, auth propio; SECURITY al día), paquete-contador con cifras y contrato vigentes. Typecheck verde, lint 0 errores. Sin commit (GIT-01 espera orden + purge; el hook bloquea hasta SEC-04).

- 2026-10-04: S2 (FUN-06/REP-02/ACC-01/02/F0-02). FUN-06: `render:retry` idempotente (`scripts/render-retry.ts`, actor con permiso de emisión, salidas 0/1/2 con alerta de vencidos) + ADR-031 (difiere `pg-boss`, gatillos, `PGBOSS_SCHEMA` reservada; ARCHITECTURE/API/SECURITY al día). REP-02: `fixtures/pdf-baseline/chrome.version` (154), test pin por major con mensaje de re-aprobación, CI instala Chrome 154 fijado con `CHROME_PATH`. ACC-02: firma golden ligada al sha256 canónico (`verifyFirma`, schema con `estado`+`sha256_contenido`, `_manifest.umbralGolive=30`; 1 fixture, 0 firmados) + 5 tests. ACC-01: `acceptance:gate --profile=ci|release|golive` con secciones TÉCNICO/FISCAL/OPERATIVO y denominadores (hoy: ci NO-GO 77/78 por credencial `app_runtime`; release/golive NO-GO 0/1 y 0/30 firmados, sin matriz/M2/acta/drill). F0-02: `docs/anexos/cotejo-gaceta-F0.md` (SNAT/2025/000054, Decreto 1.808 y UT 43 verificados en fuentes múltiples; 2 erratas secundarias descartadas; detalle por artículo queda al contador). Evidencia regenerada 04-oct (47 archivos). Typecheck verde, lint 0 errores. Sin commit.

- 2026-10-04: Incidente `serverc` (ADR-029 aceptada + runbook `incidente-serverc-2026-10-04.md`): clave SSH privada hallada trackeada en `7c70dbe` y en `origin/main` (el diagnóstico "sin trackeo" de TERCERA_REV quedó desactualizado). Decisión: rotar en servidor → rotar secretos → purge `git filter-repo` + force-push coordinado → `.gitignore` + escáner. H0 bloqueado hasta purge verificado. Enmienda `pendientes/TERCERA_REV/ENMIENDA-v1.1-2026-10-04.md` (SEC-04, contrato motor cerrado fracción + `base_gravable`, F0-01 límite lun 05-oct, H0 ≈ 6.1–10.35d).

- 2026-10-04: Landing sintetizada para contador-auxiliar (`src/app/landing-content.tsx`): quitados `100%`/`12/12`/`≤3 clics` no comprobados; ejemplo 202609-000128 marcado ficticio; emisión alineada a ADR-027, tolerancia provisional 0,01 (G8), numeración IVA hasta G9, prueba como gate `0/30–50`. Rev2: auxiliar = el sistema; resumen como insumo (no declaración); fix `/docs/comprobantes/islr` (G9 + PDF pendiente). Ver `TODO.md` Landing.

- 2026-10-02: Bitácora con beautiful-ui: `/c/[companyId]/auditoria` con AppHeader+hero+KPIs, filtros entidad/acción/ID/rango, línea de tiempo por compra (origen lote/fila), tabla con Badge y CSV con mismos filtros + anti-inyección + columnas actor/tx. `listAuditEvents` acepta `action/from/to`; `audit.read` para admin/administrativo/contador (auditor ya lo tenía).

- 2026-10-02: Plazos con beautiful-ui: tablero con KPIs, comprobantes enlazados al detalle, obligaciones y feriados con formularios validados + toasts, gating contador. `deadlines/labels` ES.

- 2026-10-02: Configuración con beautiful-ui: perfil fiscal empresa (`updateFiscalProfile` admin + audit + guard period_kind, verificado), modo ventas G7 y resumen criterio G2 con enlace. Acción documentada en API.

- 2026-10-02: Seeder `seed:company-rules` (matriz-reglas-v1): asegura conceptos ISLR, activa IVA 75 % art. 4 Providencia SNAT/2025/000054 vigente 01-08-2025 vía workflow borrador→aprobación→activación (idempotente, auditado), deja IVA 100 % art. 5 en borrador sin activar (condicional, requiere modelado) y no siembra tasas ISLR (bloqueado ADR-019). Ejecutado en Empresa Demo; ver en `/c/[companyId]/reglas`.

- 2026-10-02: Reglas con beautiful-ui: lista con conceptos/%/vigencia/KPIs, borrador (tipo↔concepto/base, vista % en vivo, diálogo nuevo concepto ISLR) y detalle (ficha, flujo con toasts, bitácora). `rules/labels` ES compartidas.

- 2026-10-02: Plantilla CSV descargable por tipo (`GET imports/template?kind=`, diálogo junto a Subir CSV) con columnas del validador + fila ejemplo.

- 2026-10-02: Terceros con beautiful-ui: `/terceros/nuevo` (AppHeader+hero+Card, RIF con vista normalizada, perfil fiscal opcional, toast, gating `docs.create`) y `/terceros/[ID]` (ficha RIF dual, edición base, historial de vigencia, bitácora). Nuevos primitivos `ui/input` y `ui/avatar` estilo shadcn.

- 2026-10-02: Registro manual de períodos fiscales en `/c/[companyId]/periodos` (solo contador): `createPeriod` mensual/quincenal idempotente + `createPeriodAction` + formulario + audit. Auto-creación al registrar se mantiene.

- 2026-10-02: Resuelve 5 inconsistencias docs: ARCHITECTURE PDF cierra a ADR-026, DECISIONS renumera ApexCharts a ADR-028, DATABASE ISLR alinea con ADR-021, README/TODO actualizan índice ADR-001–028 + fila anexos, CONVENTIONS limpia fila vacía.

- 2026-10-02: Catálogo de proveedores en `/compras/nueva` (Modal amplio con buscador; autocompleta RIF/razón; inactivos deshabilitados).
- 2026-10-02: Compras manual completa (skill beautiful-ui): servicio con kind, afectada + Inv.3, recepción y multilínea (exento incluido en Inv.1); `/compras/nueva` con shadcn (Card/Button/Badge, iconos MUI, preview Inv.1 en vivo). Compatibilidad con entrada plana F1 intacta; typecheck + test + lint + build verdes.
- 2026-10-01: Ledger de emisiones conectado (2.0.5 §5.3): append post-commit IVA/ISLR, `certSeq` por formato, `reconcileSeries` + `series:reconcile`, runbook restore. Test con restore simulado (GAP_DB).
- 2026-10-01: Comparador 2.A contra golden real (infra): `golden:inspect` sin PII + `golden:compare` con bitácora D1–D5 y decisiones vigentes + scripts en `package.json` + tests. Gate bloqueado hasta golden validado.
- 2026-10-01: 2.0.3 evidencias (c): comparador 2.A (aprobadas, tolerancias, normalización, orden canónico, informe, sanitización, apertura con soffice) + bitácora D1–D5. 67 tests + build verdes.
- 2026-10-01: Ola 1 resto (2.0.2): catalog-pack (esquema+validador+cargador a borrador+synthetic+deriva) + corpus Z/G3 ejecutables + `import:autodetect`, `g8:calibrate`, `g2:divergence`, `catalog:*`. Continuidad Z intra-lote. 60 tests + build verdes.

- 2026-10-01: 2.0.2 Ola 1 (ADR-024/025): adjuntos (UploadThing/fs, magic bytes, dedup, HMAC+TTL) + recuperación asistida (token único, invalida sesiones, break-glass) + API/DATABASE/SECURITY al día. 57 tests + build verdes.

- 2026-10-01: S0 resto (2.0.1): calibrador G8 (8 combos + CLI + test que discrimina etapa) y reporte divergencias G2 (solo lectura). Timeout 180s para 20 emisiones paralelas. 55 tests + build verdes.
- 2026-10-01: Paquete S0 (2.0.1): esquema golden + `goldens:check` en CI, normalizador de candidatos (17, todos con advertencias, fuera de fixtures), anonimizador determinista, generador de matriz, plantillas RDF/diferimiento/roles/sesión-1. Tests nuevos verdes.

- 2026-10-01: 1.0.5 operación (ADR-023): rol `app_runtime` + prueba negativa, `migration:report`, headers, UAT/manuales/runbooks/checklist/acta. 49 tests + build verdes. Activación staging/prod con `DB_LEAST_PRIVILEGE=true`.

- 2026-10-01: 1.0.4 aceptación técnica (infra): manifest sin omitidos, garantías motor, matriz fuga, 50 reservas + 20 emisiones + mismo-doc, E2E servicios, `acceptance:evidence` (32/32 archivos, 48 tests, 0 fallos). Gates fiscales pendientes del contador.
- 2026-10-01: Fix carrera mismo-documento: lock de asesoría en `issueIva` (mi edit había caído en `previewIva`) + orden de limpieza E2E. 48 tests (32 archivos) + build verdes.

- 2026-10-01: 1.0.3 evidencias (b): HTML versionado determinista (futura fuente PDF) + comparador Excel con clasificación ESTRUCTURA/VALOR/FORMATO + tests. Gate: golden real + Chromium.
- 2026-10-01: 1.0.3 evidencias (a): cortes fiscales con test, drill-down compra (líneas+origen+trazabilidad) enlazado desde libros, sustitución IVA/ISLR sin reutilizar número + tests. 38 tests + build verdes. PDF/Chromium y golden siguen bloqueados.

- 2026-10-01: Plazos 1.0.2 (`fiscal_obligations` + feriados + tablero dentro/próximo/hoy/vencido/entregado/sin-regla, sin fechas por defecto). Migración 0017. 36 tests + build verdes. Gate: norma/artículo/vigencia + caso real.
- 2026-10-01: G7 modo Z (1.0.2): `sales_mode` por empresa + máquina→sucursal + libro deriva de Z con identidad propia + control F8 convivencia + UI config/Z + test. Migración 0016. 34 tests + build verdes. Gate: mes real.
- 2026-10-01: Workflow de reglas (ADR-022): borrador→revisión→aprobación→activación con cierre de vigencia, UI + historial + test. Migraciones 0014/0015. 33 tests + build verdes. Valores reales esperan matriz.
- 2026-10-01: G3 retenciones recibidas (1.0.2): tabla + links + flujo registrada→conciliada→aplicada + línea en resumen sin neteo + UI + test. Gate: caso real + validación contador. 32 tests + build verdes.

- 2026-10-01: Fix login devuelto a /login: cookie `__Host-` se enviaba sin Secure y el navegador la rechazaba. Secure siempre con ese prefijo + test regresión. 31 tests + build verdes.

- 2026-10-01: F8 controles automáticos (7) + UI + test. Tooling: postcss forma string (Next) + `css.postcss` vacío en Vitest; build `--webpack` (Turbopack no resuelve require dinámico de lightningcss). 30 tests + build verdes.
- 2026-10-01: Alinea API, matriz G2 y pendientes de base de datos con ADR-021: la emisión ISLR puede usar abono asignado bajo criterio explícito; `unset` conserva el bloqueo salvo convergencia. No cambia la decisión histórica de ADR-017 ni cierra la validación fiscal.
- 2026-10-01: Implementa criterio G2 por empresa (`unset` default), cambio solo por contador con auditoría, previsualización ISLR dual, emisión por convergencia estricta y protección ante eventos retroactivos. Migración 0012/ADR-021; tests Neon dev, typecheck, lint y build verdes. No se aprueban reglas fiscales ni se cierra F0.
- 2026-10-01: Prepara `anexos/decision-abonos-G2-contador.md`, hoja de sesión con decisiones de evidencia contable, fecha/porción, anticipos/parciales y sustraendo ISLR; ABONO-01..03 e ISLR-07 permanecen candidatos sin aprobación.
- 2026-10-01: Aplica migración 0011 en Neon dev; valida constraints de importes tras comprobar datos históricos, verifica RLS y añade pruebas G2 de concurrencia, solapamiento, créditos sin asignación y fechas intermensuales. Typecheck, lint y pruebas dirigidas verdes.
- 2026-10-01: Implementa captura estructural G2 para pago/abono: migración 0011 aditiva, asignaciones verificadas con bloqueo transaccional y trazabilidad; ISLR rechaza eventos account_credit hasta validar reglas de parcialidad. Los escenarios de PRIMERA_REV permanecen candidatos no aprobados.
- 2026-10-01: Actualiza ADR-017, API, dominio, esquema, seguridad y TODO para separar la estructura implementada de las decisiones fiscales todavía abiertas.
- 2026-10-01: Precisa respuestas F0: G4 moneda base bolívares, USD de referencia y tasa BCV; G7 “por sucursal”; G8 “8 cifras decimales significativas”. Se documentan criterios aún pendientes y que `blueprint/cuestionarioClient.md` contiene propuestas, no decisiones completadas; F0 permanece abierta.
- 2026-10-01: Corrige `docs/README.md` y la referencia de ADR en `ARCHITECTURE.md`: refleja el estado parcial de implementación según TODO, distingue docs operativas de `blueprint/` y actualiza el índice a ADR-001–020.
- 2026-10-01: F0 con respuestas parciales del cliente; matriz IVA preliminar basada en Providencia SNAT/2025/000054; documentado pago/abono en cuenta como disparador de retención IVA/ISLR; registrado XLSX disponible y actualizados pendientes operativos. Sin aprobación ni firma fiscal.
- 2026-09-30: Auditoría 06 (TTL por env, logout UI, purga sesiones, rate limit import). Deuda restante: NC con selector de afectada, `fiscal_adjustments`, recibidas G3, modo Z en libro ventas, rate limit distribuido.
- 2026-09-30: Paquete F0 enviable (`anexos/paquete-contador.md`): matriz + dorados formato fixture + muestras + G-bloqueantes + sesión semanal.
- 2026-09-30: F7-1 health (`/api/health` vivo) + pino con redacción PII + 4 runbooks. 28 tests + build verdes.
- 2026-09-30: Aclara política de no usar Docker ni Testcontainers en ningún entorno; ajusta ADR-015, AGENTS.md y los pasos F1, pruebas DB y próximos pasos del roadmap a Neon + procesos directos.
- 2026-09-30: F6 triggers cierre + NC en DB, checklist bloqueante integrado, detalle período, bitácora + CSV. 27 tests + build verdes.
- 2026-09-30: F5-1 resumen IVA + conciliación + versionado con reproducibilidad + UI drill-down. 26 tests + build verdes. Falta spike PDF/Excel vs golden.
- 2026-09-30: F4-2b ISLR (regla por concepto+fecha, preview/issue/void, serie provisional, UI, test con regla 2%) + entrega IVA. 25 tests + build verdes. PDF fiel → F5.
- 2026-09-30: F4-2a emisión IVA (regla vigente empresa→global, preview, issue multi-factura, void, UI bandeja/nueva/detalle). Hallazgo: retry en TX abortada inútil → UPSERT atómico + resolvePeriod idem. 24 tests + build verdes. Falta ISLR.
- 2026-09-30: F4-1 tablas retenciones (8) + EXCLUDE + unique parcial series + seed 75%/6 conceptos + reserva sin huecos con reintento. 22 tests verdes.
- 2026-09-30: F3-3 confirmación (trazabilidad, idempotencia real, Z + salto=advertencia, rechazadas.csv). 21 tests verdes. F3 cerrada salvo pg-boss async (F7 si volumen lo exige).
- 2026-09-30: F3-2 parser (separador/BOM/decimales/fechas/nulos/alias) + validación por fila + UI preview. Corpus adversarial + 19 tests verdes.
- 2026-09-30: F3-1 staging (`source_files`+`batches`+`rows`, migración 0006) + subida idempotente sha256 + handler con tipo por contenido + UI lotes. 17 tests + build verdes.
- 2026-09-30: F2-2c ventas (NC≤saldo, libro+CSV) + pagos mínimos con asignaciones + `periods/resolve` compartido. 16 tests + build verdes.
- 2026-09-30: F2-2b períodos (máquina estados, cierre con hash, reapertura con motivo, UI, test ciclo+bloqueo). Hallazgo: faltaba `status` en el update — el test lo detectó.
- 2026-09-30: F2-2a terceros (upsert RIF dual, perfiles con vigencia sin overwrite, UI lista/nuevo/detalle). typecheck+lint+13 tests+build verdes.
- 2026-09-30: F2-1 tax-engine puro (round2 provisional, Inv.1/2/3, ISLR max(0,…), explanation[]) + fixture IVA-01 + fast-check 200–300 runs. 12 tests verdes. Gate: faltan dorados contador.
- 2026-09-30: F1-4b M1 provisional (tablas purchase_* + servicio Inv.1 + período auto + action + UI compras/libro + CSV anti-inyección + test). typecheck+lint+5 tests+build verdes, /login 200 vivo. PDF/Excel fiel → F5.
- 2026-09-30: F1-4a sesiones DB (sha256 token, cookie flags) + login/logout + rate limit + `audit.record()` + repo tenancy para UI + seed admin + UI login/empresas/panel. typecheck+lint+4 tests+build verdes.
- 2026-09-30: F1-3 withTenant (set_config) + authorize rol×empresa + RLS 4 tablas + Argon2id + test fuga verde en Neon. ADR-015 Sin-Docker; ARCHITECTURE/PROJECT/CONVENTIONS/SECURITY sin Docker.
- 2026-09-30: F1-2 env Zod + Drizzle client + schemas identity/tenancy/parties/periods + migraciones 0000 (tablas+extensiones) y 0001 (FK+EXCLUDE). Aplicadas en Neon, verificadas 7 tablas.
- 2026-09-30: F1-1 repo/tooling (package, TS strict, ESLint boundaries, depcruise, CI, .env.example, smoke decimal). typecheck+lint+test verdes.
- 2026-09-30: Unifica PG ≥16 + Drizzle (ADR-012), ROADMAP §3/§11 contrastados cuestionario PDF (G1–G12), DATABASE pendientes 9 filas, regenera API/SECURITY/CONVENTIONS/DECISIONS/TODO v0.1.
- 2026-09-30: Crea PROJECT.md, README.md, anexos F0 (matriz/dorados/checklist), assets trazabilidad, headers estándar.

- 2026-10-02: Branding empresa en UI: `AppHeader` con `branding` opcional (logo + franja `colorDistintivo` sanitizado `#rrggbb`) + hero del panel `/c/[id]` con logo y degradado acentuado. Fallback a marca cuando no hay branding.

- 2026-10-05: Bandejas embellecidas `/c/[id]/compras`, `/c/[id]/reportes/libro-compras`, `/c/[id]/retenciones` (hero + KPIs + tabla + branding; totales con `Decimal`; estados es-VE). Deuda saldada 2026-10-05: `GET .../reports/iva-withholdings?format=csv` implementado (`getIvaWithholdingsReport` + CSV anti-inyección + CTA en bandeja, tests 3/3, columna documentada en `API.md`). PDF/Excel fiel sigue en F5.

- 2026-10-05: Página `/c/[id]/retenciones/nueva` embellecida (hero + pasos 1-2-3 + tabla elegibles con elegir-todas y resumen + tarjeta de cálculo con `explanation[]` por línea y versión de regla; permiso `withholdings.issue` verificado en servidor con aviso si falta; fecha invalida el preview).

- 2026-10-05: Fix `EMPRESA_NO_AGENTE` en `/c/[id]/retenciones/nueva`: `listEligiblePurchases` vacío si la empresa no es agente + aviso dedicado con CTA a Configuración + errores `NOT_APPLICABLE` en lenguaje del contador. Verificado en Empresa Demo (no agente).

- 2026-10-05: Dup `Empresa Demo` (mismo RIF en `a1f8` con datos y `1419` vacía): flags Sí/Sí copiados a `a1f8` vía `updateFiscalProfile` auditado; seed-admin ahora busca por `rifOriginal` (idempotente, verificado sin tercera fila). `1419` se conserva intacta por decisión del dueño.

- 2026-10-05: Deduplicada `Empresa Demo` (RIF J-00000001-0): eliminada fila vacía `1419` (1 membresía + 9 eventos propios, cero datos fiscales) + membresía admin restaurada en `a1f8` vía `seed:admin`; terceros visibles (6 filas). Queda una sola demo con datos.

- 2026-10-07: Gestión de usuarios en `/usuarios`: alta con membresía inicial, cambio de rol, alta/baja de accesos empresa·rol, suspender/reactivar (login ya rechaza no activos), todo auditado con gate `users.manage` por empresa; tests `users.test.ts` + `recovery.test.ts` verdes.

