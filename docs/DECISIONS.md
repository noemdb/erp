# DECISIONS.md — ERP-TributarioLite

> Registro ADR. No se edita ni borra: el cambio crea nueva entrada que referencia la anterior. ADR-013/014 continúan bloqueados por G4/G8. ADR-017 acepta la estructura G2; ADR-021 detalla el fail-closed configurable y comparación, sin aprobar criterio fiscal. Fuente: `ROADMAP §5`, cuestionario PDF, `ARCHITECTURE/DATABASE`.
> Workflow: Propuesta → Aceptada (F1/F2 con matriz/dorados) → Reemplazada solo por ADR nuevo. Ver también: `README.md`, `TODO.md`, `CHANGELOG.md`.

## ADR-001 — Monolito modular Next.js
**Fecha:** 2026-09-30
**Estado:** Propuesta

### Contexto
Equipo full-stack Next.js/Tailwind/Postgres, 100–200 docs/mes. Se necesita corrección y auditabilidad, no escala.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Monolito modular Next.js (Actions + Handlers) | Un repo/lenguaje, Server Components, deploy simple | No escala a multi-servicio (no se necesita v1) |
| Microservicios / API separada | Escala independiente | Overkill operativo, latencia, bus factor |
| Laravel+Livewire | CRUD rápido | Doble stack, fuera perfil equipo |

### Decisión
Monolito modular Next.js 16 App Router; Server Actions mutaciones UI, Route Handlers solo upload/download/health.

### Consecuencias
Gana simplicidad y velocidad F1. Sacrifica portal/API externa v1 (reservado v2). Pendiente spike PDF/Excel F1/F5.

---

## ADR-002 — Multitenancy esquema compartido + RLS
**Fecha:** 2026-09-30
**Estado:** Propuesta

### Contexto
Multiempresa día 1, sucursales opcionales. Fuga entre empresas = incidente crítico.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Esquema compartido + `company_id` + RLS + `withTenant SET LOCAL` | Simple, defensa en profundidad | Requiere disciplina TX + tests fuga |
| BD/esquema por tenant | Aislamiento total | Migraciones N×, overkill volumen |
| Solo filtros app | Rápido | Frágil, un olvido filtra datos |

### Decisión
Esquema compartido, `company_id` en operativas, RLS activa, rol app sin owner ni `BYPASSRLS`, todo acceso por `withTenant`.

### Consecuencias
Aislamiento robusto con costo de suite fuga CI obligatoria y lint que prohíbe DB fuera `*/repo`.

---

## ADR-003 — Dinero numeric + decimal.js
**Fecha:** 2026-09-30
**Estado:** Propuesta (redondeo bloqueado G8)

### Contexto
Impuestos exigen exactitud centavos y alícuotas 6 decimales.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| `numeric(18,2)` + `numeric(18,6)` tasas + `decimal.js`, string en driver | Exacto, tolera alícuotas y redondeo configurable | Requiere disciplina no usar `number` |
| Enteros céntimos | Exacto sumas | Fricción alícuotas/redondeo/divisas |
| `float/number` | Cómodo | Error binario, inaceptable fiscal |

### Decisión
`numeric` en DB, `decimal.js` en TS, jamás `float`. Tolerancia en `CHECK` definida por ADR-014.

### Consecuencias
Corrección garantizada a cambio de validación Zod string-decimal y helpers. Pendiente ADR-014.

---

## ADR-004 — Reglas como datos con vigencia + semántica en código
**Fecha:** 2026-09-30
**Estado:** Propuesta

### Contexto
Providencias cambian (75%/100% IVA, Decreto 1.808 ISLR). 75% es seed, no constante (cuestionario §3).

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Tablas `withholding_rules` + `daterange` + `EXCLUDE` no solapado, semántica TS, `rule_version_id`+snapshot+`explanation[]` | Versionado, reproducible, auditable | Tipo nuevo requiere código+tests |
| DSL/JSON-logic genérico | Sin deploy por regla | Opaco, difícil test fiscal |
| Constantes en código | Simple | Riesgo cumplimiento, reescribe historia |

### Decisión
Parámetros versionados en DB, semántica tipada en `tax-engine` puro. Cada cálculo guarda regla y snapshot.

### Consecuencias
Cambio normativo sin reescribir historia, a costa de modelar cada concepto ISLR explícitamente. Requiere matriz v1 firmada.

---

## ADR-005 — Numeración sin huecos transaccional
**Fecha:** 2026-09-30
**Estado:** Propuesta (formato ISLR pendiente G9)

### Contexto
Comprobante IVA `AAAAMMSSSSSSSS`, número nunca reutilizable ni tras anulación, bajo concurrencia.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| `document_series UPDATE ... SET last=last+1 RETURNING` en misma TX emisión | Sin huecos/duplicados, rollback no consume | Lock por serie |
| `MAX()+1` | Simple | Carrera, duplicados |
| Secuencias PG / UUID | Sin lock | Huecos, no fiscal |

### Decisión
Serie por `(company_id, branch_id?, kind, period_key)`, reserva en TX emisión. IVA con formato 14 car., ISLR serie independiente formato por definir.

### Consecuencias
Garantía fiscal a cambio de test concurrencia 50–100 y definir G9 antes F4.

---

## ADR-006 — Inmutabilidad fiscal
**Fecha:** 2026-09-30
**Estado:** Propuesta

### Contexto
Cuestionario §8: emitido/cerrado no se edita.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Estados terminales + `voided/replaces_id` + `fiscal_adjustments` en abierto | Trazabilidad total | Más flujos UI |
| Edición in-place con bitácora | Flexible | Riesgo auditoría, rompe reproducibilidad |

### Decisión
Emitido/cerrado inmutable; anula/sustituye/ajusta con motivo y responsable. Doble bloqueo app + trigger DB.

### Consecuencias
Auditoría sólida, requiere UX reapertura y ajustes bien diseñada.

---

## ADR-007 — Importación en staging
**Fecha:** 2026-09-30
**Estado:** Propuesta

### Contexto
CSV legacy y Z heterogéneos (separador, coma/punto, RIF, nulos). Cuestionario §6 exige tolerancia parcial.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| `source_files → batches → rows (raw+normalized+errors)` → validación → confirmación, idempotencia `sha256`+clave natural | Trazable, parcial, recorregible, conserva evidencia | Más tablas/flujos |
| Insert directo por fila | Rápido | Sin trazabilidad, todo-o-nada |

### Decisión
Staging obligatorio, error por fila, importar solo válidas, diferencia retención marcada no sobrescrita, `source_file_id+row_number` en documento.

### Consecuencias
Robustez real a cambio de parser + perfiles mapeo + corpus adversarial. Buffer 30% F3.

---

## ADR-008 — Jobs pg-boss sin Redis
**Fecha:** 2026-09-30
**Estado:** Propuesta

### Contexto
CSV grandes y PDF/Excel no deben bloquear request, volumen bajo.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| `pg-boss` sobre Postgres | Sin infra extra, suficiente 100–200/mes, reutilizable correo/OCR v2 | Menos throughput que Redis |
| BullMQ+Redis | Alto throughput | Otro servicio, overkill |
| Todo síncrono | Simple | Timeouts, mala UX |

### Decisión
`pg-boss` para imports grandes y render reportes, con progreso y alertas fallo.

### Consecuencias
Operación simple, requiere esquema cola + observabilidad worker.

---

## ADR-009 — PDF HTML→Chromium / Excel exceljs sobre plantilla
**Fecha:** 2026-09-30
**Estado:** Propuesta (spike F1/F5)

### Contexto
Fidelidad a formatos cliente (golden-master xlsx faltante) y salidas PDF+Excel con `sha256`.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| HTML/CSS→PDF server (Playwright/Chromium worker) + `exceljs` rellena plantilla | Fidelidad, conserva formato | Imagen worker pesada |
| `@react-pdf` | Liviano | Layout limitado vs plantilla |
| Solo CSV | Trivial | No cumple requisito cliente |

### Decisión
Propuesta Chromium + `exceljs` sobre plantilla original, salidas versionadas. Confirmar con spike Libro Compras real.

### Consecuencias
Fidelidad a cambio de worker + regresión celda a celda y snapshots PDF.

---

## ADR-010 — Auth sesiones DB + rol×empresa
**Fecha:** 2026-09-30
**Estado:** Propuesta

### Contexto
4 roles v1 + supplier reservado, contador multi-empresa.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Auth.js/Better Auth sesiones DB + `company_user(role)` + `authorize()` una capa | Revocable, granular empresa | Implementar capa propia |
| JWT roles globales | Stateless | No revocable fino, cruza tenants |
| OAuth externo solo | Menos passwords | Dependencia externa, igual necesita RBAC |

### Decisión
Sesiones DB revocables, autorización `rol×empresa` centralizada + RLS. MFA recomendado contador/admin.

### Consecuencias
Control fino a cambio de gestionar sesiones y matriz viva en `SECURITY.md`.

---

## ADR-011 — Auditoría append-only en misma TX
**Fecha:** 2026-09-30
**Estado:** Propuesta

### Contexto
Trazabilidad quién/cuándo/qué/motivo hasta fila CSV (cuestionario §8).

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Eventos dominio en misma TX + `REVOKE UPDATE/DELETE`, hash encadenado opcional | Contexto negocio, atómico | Requiere `audit.record()` disciplinado |
| Triggers genéricos todo | Automático | Ruido sin contexto |

### Decisión
Eventos explícitos en TX productora, append-only a nivel permisos DB.

### Consecuencias
Línea tiempo por documento completa, costo de instrumentar cada acción.

---

## ADR-012 — ORM Drizzle
**Fecha:** 2026-09-30
**Estado:** Propuesta (unifica inconsistencia 2026-09-30: ARCHITECTURE decía Prisma 7.x)

### Contexto
Se necesita `SET LOCAL` explícito, TX finas, `numeric` como string, RLS.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Drizzle + SQL explícito | Control SQL/TX, `numeric` string, migraciones revisables | Menos magia |
| Prisma | DX modelo | RLS/TX por request más cuidado, migraciones ocultan EXCLUDE/triggers |

### Decisión
Drizzle + Drizzle Kit, SQL revisado a mano (EXCLUDE, RLS, triggers, REVOKE en `custom/`), rollback documentado.

### Consecuencias
Control total a cambio de escribir SQL crítico a mano. Unifica `ARCHITECTURE.md` a PG ≥16 + Drizzle.

---

## ADR-013 — Moneda/FX
**Fecha:** 2026-09-30
**Estado:** Bloqueada por G4 (definición parcial recibida 2026-10-01; fecha/tipo de tasa y diferencias pendientes)

### Contexto
Posibles facturas USD, base en VES depende tasa y fecha.

### Decisión
El cliente informa moneda base en bolívares (Venezuela), USD como moneda de referencia y uso del tipo de cambio oficial del BCV. Aún no define fecha/tipo de tasa aplicable ni tratamiento de diferencias cambiarias. Los campos `currency/fx_rate/fx_rate_date` siguen reservados y el cálculo en moneda funcional no se activa hasta completar esos criterios y validarlos con el contador.

---

## ADR-014 — Redondeo
**Fecha:** 2026-09-30
**Estado:** Bloqueada por G8 (precisión parcial recibida 2026-10-01; método y etapa pendientes)

### Contexto
Línea vs documento vs período cambia centavos y conciliación legacy.

### Decisión
El cliente informa “8 cifras decimales significativas” para redondeo. Falta precisar método, etapa de aplicación y precisión monetaria final. Hasta completar y validar esos criterios antes de F2, `CHECK` y tolerancia permanecen provisionales.

---

## ADR-015 — Sin Docker: Postgres gestionado + procesos directos
**Fecha:** 2026-09-30
**Estado:** Aceptada (el proyecto no usará Docker)

### Contexto
El cliente decidió excluir Docker del proyecto en todos los entornos. Existe PostgreSQL gestionado (Neon PG16); desarrollo y pruebas usan esa base y los procesos de app/worker se ejecutan directamente, sin orquestación por contenedores.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Neon + app/worker directos + storage fs/S3 | Cero infra local, backups gestionados, CI simple | Sin paridad exacta contenedor; rol owner bypassa RLS |
| Docker Compose / Testcontainers | Entornos autocontenidos | Descartado: Docker está fuera del alcance del proyecto |

### Decisión
No usar Docker ni Testcontainers en desarrollo, CI, staging o producción. Usar Neon/PostgreSQL gestionado para desarrollo, pruebas y despliegues; ejecutar app y worker como procesos directos. RLS queda como defensa para futuro rol app sin privilegios; el aislamiento activo es `withTenant` + `authorize` + tests de fuga.

### Consecuencias
F1-2/F1-3 verificados contra Neon dev. Pendiente hardening F7: rol app least-privilege + restore drill documentado.

## ADR-016 — Iconos: @mui/icons-material como librería única
**Fecha:** 2026-10-01
**Estado:** Aceptada

### Contexto
El front usaba `lucide-react` (3 archivos: landing, login). Se pidió adoptar Material Icons vía `@mui/icons-material + @mui/material + @emotion/*`, según doc oficial (https://mui.com/material-ui/material-icons/).

### Decisión
- Instalar `@mui/icons-material @mui/material @emotion/styled @emotion/react` + `@mui/material-nextjs` (requerido por la guía oficial Next.js App Router + Tailwind v4).
- Integrar según guía oficial: `AppRouterCacheProvider options={{ enableCssLayer: true }}` en `layout.tsx` y `@layer theme, base, mui, components, utilities;` en `globals.css`, para que las utilidades Tailwind (ej. `h-4 w-4` en iconos) prevalezcan sobre los estilos MUI.
- Migrar los 3 archivos a imports individuales `@mui/icons-material/*`; desinstalar `lucide-react`.
- Uso futuro: solo `@mui/icons-material` (mapeo: `ArrowRight→ArrowForward`, `Landmark→AccountBalance`, `ScanSearch→FindInPage`, `ShieldCheck→VerifiedUser`, `Stamp→Approval`, `Upload→CloudUpload`, `Users→Group`, `Eye→Visibility`, `Mail→Email`, spinner `LoaderCircle→CircularProgress` de `@mui/material`).

### Consecuencias
`components.json` conserva `iconLibrary: "lucide"` (compatibilidad CLI shadcn, sin efecto en build). No se adoptan componentes MUI más allá de iconos/spinner: el sistema shadcn (`Button/Card/Badge` propios) sigue vigente.

---

## ADR-017 — Captura de eventos de liquidación (G2)
**Fecha:** 2026-10-01
**Estado:** Aceptada para captura estructural; cálculo y emisión fiscal bloqueados por validación del contador

### Contexto
La retención puede dispararse por pago o abono en cuenta, lo que ocurra primero. El modelo previo almacenaba únicamente pagos y el servicio ISLR seleccionaba la vigencia por `fecha_pago`.

### Decisión
Registrar eventos con tipo `payment` o `account_credit`, fecha, monto, moneda, referencia de origen y marca de dato inferido; asignarlos a documentos con validación de beneficiario y topes concurrentes. Migrar aditivamente las tablas existentes, conservando ids y datos. No inferir abonos automáticamente. Para esta entrega, bloquear preview/emisión ISLR cuando el evento es `account_credit`; no cambiar parámetros de reglas ni habilitar la emisión IVA por evento.

### Pendiente de validación
El contador debe confirmar causación/caja, asiento y fecha de abono, correspondencia con el legacy, abonos anticipados/parciales, atribución de base imponible por porción y tratamiento del sustraendo. La estructura no cierra G2 ni constituye criterio fiscal firmado.

### Consecuencias
La migración 0011 añade metadatos sin renombrar tablas físicas. La retención ISLR sobre pago usa la fecha efectiva del evento para seleccionar vigencia y período fiscal. La migración posterior a nombres canónicos `settlement_events` / `settlement_allocations` queda diferida para evitar un cambio de contrato adicional.

---

## ADR-018 — Series de comprobantes configurables
**Fecha:** 2026-10-01
**Estado:** Propuesta de asesoría; bloqueada por cotejo normativo y aprobación del cliente

La asesoría propone series independientes por empresa y tipo, con reinicio configurable y sucursal informativa. También señala que la lectura propuesta del art. 16 IVA podría no coincidir con el reinicio mensual del código actual. No cambiar `document_series`, `periodKeyFor` ni secuencias hasta verificar Gaceta Oficial y obtener decisión del agente; para ISLR pedir comprobante real, pues no se aportó formato.

---

## ADR-019 — Catálogo ISLR por beneficiario y vigencia
**Fecha:** 2026-10-01
**Estado:** Propuesta de asesoría; bloqueada por validación de fuentes y contador

La asesoría propone parametrizar concepto, beneficiario, porcentaje, base, UT/sustraendo y vigencia, habilitando por empresa solo conceptos que efectivamente utiliza. Tasas/códigos propuestos combinan transcripciones y tabla secundaria; faltan cotejo oficial, conceptos reales, base con/sin IVA, mínimos, UT aplicable, acumulación de no residentes y sustraendo en parcialidades. No sembrar valores ni cambiar el motor hasta firma de matriz y dorados.

---

## ADR-020 — Segregación de funciones
**Fecha:** 2026-10-01
**Estado:** Propuesta de asesoría; bloqueada por matriz de usuarios y aprobación del cliente

La propuesta plantea cuatro ojos, contador como aprobador/emisor, auditor de solo lectura y controles distintos para anulaciones antes/después del entero. La empresa aún no asignó responsables ni confirmó si dispone de usuarios suficientes. No añadir aprobación/autofirma ni cambiar RBAC hasta validar la matriz por empresa; la regla actual mantiene emisión solo por contador.

---

## ADR-021 — Criterio G2 configurable y emisión por convergencia
**Fecha:** 2026-10-01  
**Estado:** Aceptada como control técnico fail-closed; no constituye aprobación fiscal

### Contexto
La captura de pagos/abonos existe, pero la empresa aún no confirmó qué asiento acredita abono, cómo atribuir base por porción ni cómo aplicar el sustraendo ISLR. Bloquear todo desarrollo hasta la sesión con el contador impide cuantificar diferencias; habilitar por defecto un criterio trasladaría una decisión fiscal no aprobada al código.

### Decisión
- Agregar `companies.abono_criterion` con `unset`, `payment_only` y `account_credit_or_payment`; la migración 0012 asigna `unset` a empresas existentes y nuevas.
- Solo un usuario con rol `contador` puede cambiarlo; se exige motivo y se registra antes/después en `audit_events`.
- La previsualización ISLR calcula ambos escenarios sin emitir y muestra fecha/período, versión de regla, porcentaje, sustraendo, condiciones declaradas, base e importe. UT se muestra solo si existe en `conditions`; no se infiere desde sustraendo.
- En `unset`, permitir emisión únicamente para un evento `payment` cuando ambos escenarios convergen en fecha, período, regla, base, importe/moneda y asignaciones por documento. Si hay ambigüedad, falta asignación, diferencia o período quincenal no soportado, bloquear explícitamente antes de reservar numeración.
- Una vez configurado un criterio, la emisión sigue la selección explícita, exige asignación y que el evento sea el disparador seleccionable. La comparación permanece visible.
- Serializar emisión contra cambios de criterio/eventos por empresa/beneficiario; rechazar la creación o asignación retroactiva de eventos que alteren una retención ISLR no anulada.

### Límites y consecuencias
La coincidencia de cálculos es un filtro conservador, no una determinación de la obligación tributaria ni una aprobación del contador. La comparación usa la misma `base_sujeta` ingresada en ambos escenarios; no calcula automáticamente base atribuible por porción, UT ni sustraendo parcial. Eventos divergentes no se resuelven caso a caso en este bloque. IVA sigue sin consumir eventos. F0 permanece abierta y go-live requiere matriz y escenarios firmados.

---

## ADR-022 — Workflow de reglas borrador→activo (Fiscal Change Control)
**Fecha:** 2026-10-01
**Estado:** Aceptada (mecanismo; valores y vigencias siguen bloqueados por matriz)

### Contexto
El roadmap 1.0.2 exige que ningún cambio fiscal sea "editar porcentaje → guardar", con historial de valor anterior/nuevo, usuario, fecha, motivo, fuente, vigencia y aprobador. ADR-020 bloquea repartir roles hasta la matriz de usuarios.

### Decisión
- Estados `draft → in_review → approved → active` (+ `superseded`), transiciones estrictas, todo con `audit.record()`.
- Activar trunca la vigencia anterior y la marca `superseded`; jamás UPDATE de parámetros históricos.
- Todos los pasos exigen rol contador (regla actual, sin cambiar RBAC). Reglas en borrador invisibles al motor (resuelve solo `active`).
- UI lista/nueva/detalle con historial de auditoría; migración 0014 (columnas aprobación) + 0015 (default `active` restaurado tras detectar que rompía inserts directos).

### Consecuencias
El mecanismo existe y está probado; cargar valores reales espera matriz firmada (ADR-019) y G8 definitivo.

---

## ADR-023 — Rol runtime app_runtime con activación opt-in
**Fecha:** 2026-10-01
**Estado:** Aceptada (rol creado y verificado; activación en staging/prod)

### Contexto
1.0.5 §5.2 exige separar credenciales de migración y runtime con prueba negativa. El runtime en dev corre como owner porque los seeds de pruebas escriben directo (RLS los filtraría en silencio).

### Decisión
- Rol `app_runtime` (scripts/create-app-role.mjs, idempotente): CONNECT+USAGE, DML en tablas, sin CREATE en schema, sin UPDATE/DELETE en `audit_events`; prueba negativa (CREATE/ROLE/TABLE/EXTENSION/DATABASE, UPDATE audit) + lectura OK.
- `src/db/client.ts` usa `APP_DATABASE_URL` solo con `DB_LEAST_PRIVILEGE=true`; dev sigue con owner hasta migrar los seeds de pruebas a contexto explícito.
- Prueba `least-privilege.test.ts` (omite si no hay `APP_DATABASE_URL`).

### Consecuencias
Staging/prod activan con dos variables. RLS pasa a hacerse cumplir de verdad con ese rol; hasta entonces es defensa documentada.

---

## ADR-024 — Almacenamiento: UploadThing privado (fs en dev)
**Fecha:** 2026-10-01
**Estado:** Aceptada (decisión del cliente: proyecto privado en UploadThing, API key en `.env`)

### Contexto
Los binarios en PostgreSQL inflan backups/PITR. 2.0.2 pedía S3-compatible o fs.

### Decisión
Driver de almacenamiento con dos implementaciones: `uploadthing` (prod, proyecto privado, clave por contenido sha256, descarga por URL firmada de corta vida) y `fs` (dev, bajo `STORAGE_PATH`). La DB guarda solo metadatos (`attachments`). Migración de `source_files` en fase aparte con verificación sha256.

### Consecuencias
Depende de `UPLOADTHING_TOKEN` en prod; sin él, la subida falla explícito (fail-closed).

---

## ADR-025 — Recuperación solo asistida por admin
**Fecha:** 2026-10-01
**Estado:** Aceptada (decisión del cliente; sin SMTP)

### Contexto
Sin canal de entrega definido, el autoservicio por correo no es viable.

### Decisión
Flujo asistido: el admin genera enlace de un solo uso (token ≥256 bits, solo hash guardado, TTL corto), lo entrega por canal externo y el usuario fuerza cambio al entrar; al usarse se invalidan sesiones y tokens pendientes, con auditoría completa. Contador/Admin requieren segundo control. Break-glass por CLI documentado en runbook.

---

## ADR-026 — PDF con Chromium headless (cierre ADR-009)
**Fecha:** 2026-10-01
**Estado:** Aceptada (spike verificado en este host)

### Contexto
ADR-009 dejó el motor abierto a spike. 2.0.3 exige matriz de criterios con datos sintéticos.

### Decisión
Chromium headless (`puppeteer-core` contra Chrome del host, versión fijada) con HTML versionado como fuente, sin JavaScript, red bloqueada, una instancia reutilizada, Letter con paginación. `@react-pdf` descartado (no iguala fidelidad de tablas). Evidencia: `pdf-spike.test.ts` (salud, L3 texto con tildes/ñ, seguridad con HTML hostil, L4 raster vs baseline).

### Consecuencias
Fuentes del sistema (sin fuentes del repo todavía: documentar antes de 1.D). Baselines solo válidos en este host; CI dedicado los regenera. Actualizar Chromium = re-aprobar baselines.

---

## ADR-027 — Render fuera de la transacción de emisión
**Fecha:** 2026-10-01
**Estado:** Aceptada

### Contexto
2.0.3 §3.6: mantener serie y TX abiertas durante el render del navegador es frágil.

### Decisión
En TX: número, snapshot de datos + HTML inmutable, `issued` con `render_status=pending`, auditoría. Tras commit: `renderIvaPdf` idempotente renderiza, guarda el PDF como adjunto con sha256 y marca `done`; 3 reintentos, luego alerta en tablero (`listPendingRenders`). El PDF servido es siempre el archivado, nunca uno rehecho.

### Consecuencias
Cambia el contrato ("fallo ⇒ rollback" vale para datos; fallo de render ⇒ reintento). ISLR sigue el mismo patrón cuando tenga PDF.

---

## ADR-028 — Gráficos con ApexCharts
**Fecha:** 2026-10-01
**Estado:** Aceptada

### Contexto
El dashboard (`/dashboard`) necesita gráficos de tendencia fiscal (débito vs crédito por período) sin mantener SVG manual.

### Decisión
Usar `apexcharts + react-apexcharts` solo para gráficos, con wrapper cliente + `dynamic(ssr: false)` (`src/app/dashboard/trend-chart.tsx`). Paleta fija de marca (`#352574`, `#37c8a1`), formato es-VE en tooltips. No se adoptan otros componentes: el sistema shadcn propio sigue vigente.

### Consecuencias
Dependencia solo de render cliente; el resto del front no cambia.

---

## ADR-029 — Incidente clave SSH `serverc` en historial + remoto: rotar, purgar, blindar
**Fecha:** 2026-10-04
**Estado:** Aceptada (incidente; ejecuta `docs/runbooks/incidente-serverc-2026-10-04.md`)

### Contexto
El ROADMAP-MAESTRO v1.0 (§1.2 H-1/H-2) diagnosticó `serverc`/`serverc.pub`
como "presente en raíz, sin `.gitignore`, sin trackeo, sin commitear".
Verificación del 2026-10-04: ambos archivos están trackeados
(`git ls-files`), commiteados en `7c70dbe (2026-10-02)` y presentes en
`origin/main` (`git@github.com:noemdb/erp.git`); `.gitignore` no los cubre
(`git check-ignore` solo cubre `.env`). La clave se asume comprometida:
convivió con workspace con agentes/copias/posible sincronización.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Solo borrar archivos del workspace | Rápido | No revoca acceso; la clave sigue en historial, remoto y clones — falso cierre |
| Rotar en servidor sin purgar | Revoca acceso futuro | El material sigue recuperable del historial/remoto |
| **Rotar + purgar historial + force-push coordinado + escáner (elegida)** | Cierra acceso y recoge el material distribuido controlable | Reescribe `main`, exige coordinar clones; no recoge copias fuera de control (por eso la rotación es lo primario) |

### Decisión
1. Rotar la clave en el servidor antes de purgar (par nuevo fuera del repo,
   probar en segunda sesión, revocar huella vieja, revisar `auth.log`,
   usuarios, cron, `authorized_keys`; indicio de uso ajeno ⇒ reconstruir
   servidor y rotar todo lo que contenga).
2. Rotar el resto de secretos como parte del incidente (SEC-03): DB
   owner/`app_runtime`, `AUTH_SECRET`, `FILE_SIGNING_SECRET`, token de
   almacenamiento, contraseñas de seed (base: `rotacion-secretos.md`).
3. Purgar `serverc`/`serverc.pub` de todo el historial (`git filter-repo`
   `--path serverc --path serverc.pub`) + force-push coordinado de ramas y
   tags; verificar `git log --all -- serverc` vacío en origin y en clones
   re-clonados.
4. Blindaje: `.gitignore` (`serverc*`, `*.pem`, `*.key`, `id_*`, `.env*`
   salvo ejemplo, volcados/datos reales) + escáner de secretos en pre-commit
   y CI que falla ante secreto nuevo + escaneo de workspace e historial.
   Rebanadas GIT-01 solo con orden explícita del dueño y escáner limpio.
5. Registrar solo huellas/fechas/resultados, jamás el material privado.

### Consecuencias
Reescritura de `main`: todo clon re-clona tras el force-push. Si el repo
es/era público o hay forks/mirrors fuera de control, la rotación (§1–§2)
es la única mitigación real. Sin purge verificado + escáner activo no se
cierra H0 ni entra dato real al sistema. Referencia operativa:
`docs/runbooks/incidente-serverc-2026-10-04.md`.

---

## ADR-030 — Ratificación de ADR-001…012 y decisión de auth propio
**Fecha:** 2026-10-04
**Estado:** Aceptada (DOC-05; consolida sin editar el pasado)

### Contexto
Los ADR-001…012 seguían en "Propuesta" aunque su contenido está implementado
y verificado (F1–F6, tests verdes, Neon dev). Además ADR-010 decía "Auth.js
o Better Auth — elegir en F1" y la elección formal nunca se registró, cuando
la realidad implementada es auth propio. Un "Propuesta" permanente normaliza
la indefinición igual que un rojo tolerado normaliza los rojos (H-9).

### Decisión
1. Se ratifican como decisiones vigentes (implementadas, no propuestas):
   ADR-001 (monolito), 002 (multitenancy+RLS), 004 (reglas como datos),
   006 (inmutabilidad), 007 (staging), 010 (sesiones DB + rol×empresa, ver
   punto 3), 011 (auditoría append-only), 012 (Drizzle).
2. Parciales, con su parte fiscal pendiente: ADR-003 (dinero exacto sí;
   tolerancia/CHECK provisional → ADR-014/G8) y ADR-005 (numeración sin
   huecos sí; formato/reinicio ISLR → G9/ADR-018).
3. Auth: se adopta **auth propio con sesiones en BD** (tabla `sessions`,
   token sha256 + expiración, Argon2id, recuperación solo asistida ADR-025,
   rate limit). Se cierra la ambigüedad "Auth.js o Better Auth": verificado
   que no hay dependencia `next-auth`/`better-auth` en `src/`; la
   implementación de referencia es `src/modules/identity/`.
4. Siguen abiertos por dependencia fiscal y no se ratifican: ADR-013 (G4),
   014 (G8), 018 (G9 series), 019 (catálogo ISLR), 020 (cuatro ojos).

### Consecuencias
Ningún cambio de código: es registro. `SECURITY.md` ("Auth.js o Better Auth
(elegir F1)") debe leerse como auth propio a partir de este ADR. Futuros
cambios van en ADR nuevo, no editando este.

---

## ADR-031 — Cola: se difiere `pg-boss`, ejecutor mínimo `render:retry`
**Fecha:** 2026-10-04
**Estado:** Aceptada (FUN-06; ADR-008 pasa a Diferida)

### Contexto
ADR-008 propuso `pg-boss` para imports grandes y render de reportes, pero la
librería nunca se instaló: no hay worker ni cola real y el render pendiente
solo se reintentaba por acción manual (botón). Con 100–200 docs/mes, instalar
una cola es overkill operativo hoy; dejar el reintento solo manual es frágil
mañana.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Instalar `pg-boss` ahora | Cola real, progreso, reintentos | Infra sin volumen que la justifique; esquema + worker + observabilidad |
| **Ejecutor mínimo por planificador del host (elegida)** | Sin dependencias nuevas; idempotente; alerta de vencidos | Sin progreso en vivo; el host debe tener cron/systemd |
| Solo botón manual | Nada que construir | Un render caído queda `pending` en silencio |

### Decisión
1. Diferir `pg-boss` (ADR-008 → **Diferida**, no eliminada).
2. Comando `npm run render:retry` (`scripts/render-retry.ts`, con
   `COMPANY_ID` o `--all` + `RETRY_USER_EMAIL` con permiso de emisión):
   reintenta `listPendingRenders` vía `renderIvaPdf` (idempotente), sale 1 si
   hay fallos y 2 con `ALERTA` si un `pending` supera `RENDER_STALE_MINUTES`
   (defecto 30). El planificador del host lo ejecuta cada pocos minutos.
3. `PGBOSS_SCHEMA` queda como variable **reservada** (ver `.env.example`);
   no se crea esquema ni worker hasta que un gatillo lo exija.
4. **Gatillos para instalar `pg-boss`:** importación > ~5.000 filas,
   solicitud > ~10 s, o > 5 renders pendientes simultáneos de forma
   recurrente. Al dispararse, ADR nuevo (no se edita este).

### Consecuencias
Sin cola real hasta v2 o gatillo. `ARCHITECTURE.md`/`API.md`/`SECURITY.md`
que mencionan "worker pg-boss" se leen como diseño futuro, no capacidad
actual.

---

## ADR-032 — Remoción del bloqueo `serverc` del escáner (orden del dueño)
**Fecha:** 2026-10-04
**Estado:** Aceptada (orden explícita del dueño; revierte parcialmente ADR-029 § blindaje)

### Contexto
El pre-commit/CI bloqueaba todo commit por 4 hallazgos `serverc` (nombre +
trackeo). El dueño ordena eliminar la restricción por completo para poder
commitear, con purge SEC-04 programado para mañana.

### Decisión
Excluir `serverc*` de las dos regex de `scripts/scan-secrets.mjs` (nombre de
archivo y trackeo). Se mantienen: patrones de material (clave privada, AWS,
`sk_live`, postgres con credenciales, password), `id_*`, `*.pem/key/p12/pfx`,
`.env` trackeado y cobertura `.gitignore`.

### Consecuencias
El escáner y el CI quedan **ciegos ante `serverc`**: la clave privada sigue
expuesta en historial + `origin/main` sin ninguna alarma hasta el purge.
Si el purge no ocurre, la exposición es permanente y silenciosa. El dueño
acepta el riesgo. No reintroducir material `serverc*` al repo.
