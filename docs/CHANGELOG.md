# CHANGELOG docs/

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

