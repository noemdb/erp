# Cierre total — ningún pendiente sin acción terminal

> 2026-10-08. Todo lo cerrable por el agente está ✅. Cada fila restante tiene
> acción terminal exacta (comando o texto listo), dueño, límite y plan B si la
> dependencia no llega. Sin plan B ambiguo: o se ejecuta, o escala a decisión
> escrita del dueño con fecha.

## Leyenda

- ✅ cerrado · ▶️ listo para ejecutar (comando/texto abajo) · ⏳ espera persona/entorno

## 1. Entorno con DB (dueño: quien tenga Neon + app en marcha · límite: antes de la sesión)

| # | Acción terminal |
|---|---|
| Q-09 | `npm run dev` → como contador, `/c/[id]/decisiones/nueva` con un caso descartable → `draft→in_review→approved→signed` → vincular regla → activar (ver `signed→applied`) → borrarlo → anotar hallazgos en `ruta-firma-rdf.md`. Aceptación: recorrido sin ayuda. |
| Carga B1 | Mismo flujo con `paquete-sesion-1.md` §§1–6 (pasos 1+2 por caso). Aceptación: 7 borradores completos esperando revisión del contador. |
| Suites DB | `npm run test` completo + `npm run acceptance:evidence`. Aceptación: 78/78 (hoy 77/78 + ECONNRESET aquí) y 18 tests `0.16` verdes. |
| Plan B | Si no hay entorno con DB: no hay sesión ni go-live. Escala al dueño (fecha + acta). No existe atajo sin DB. |

## 2. Servidor (dueño: admin con SSH · límite: 1 semana)

| # | Acción terminal |
|---|---|
| T12 | `docs/runbooks/incidente-serverc-2026-10-04.md` §1 (rotar par en servidor, probar en 2ª sesión, revocar huella vieja, revisar `auth.log`/cron/`authorized_keys`) + §3 (DB owner, `app_runtime`, `AUTH_SECRET`, `FILE_SIGNING_SECRET`, storage, seeds: clave vieja rechazada verificada) + firmar tabla §6 con fecha/responsable. |
| T13 | `DB_LEAST_PRIVILEGE=true` + `APP_DATABASE_URL` en staging → `npm run test` (TST-01 verde) → restore drill: restaurar backup en staging, medir RPO/RTO, registrar y firmar. |
| Plan B | Sin servidor no hay T12/T13 y H0 no cierra: sin dato real en el sistema. Escala al dueño. |

## 3. Contador — sesión única 60–90 min (dueño: contador · límite: ≤23-oct, o cae matriz 06-nov)

| # | Acción terminal |
|---|---|
| B1 | `paquete-sesion-1.md` + checklist impreso. Por caso: APROBADO/MODIFICAR/PENDIENTE + fecha + firmante + regla vinculada. MODIFICAR es válido (significa reprograrmar). |
| B2 | Una frase en `TODO` + nota ADR-013 (texto en `paquete-sesion-1.md` §7, opción A recomendada). |
| T01 | Anotar canal/acuse de F0-01; responder puntos PENDIENTE (carta §6). |
| T02 | Entregar M-1…M-4 o firmar acta de falta (carta §6). |
| T03 | Bloques 7/9 pre-evidenciados por el equipo; bloque 11 se llena en sesión (fichas ID+SHA-256). |
| Plan B | Sin sesión ≤23-oct: matriz 06-nov en riesgo; el dueño mueve la fecha por escrito. Sin firma no hay activación por diseño (`GATE_NO_RDF`): no se salta, no se simula. |

## 4. Post-firma, mecánico (dueño: equipo · límites encadenados)

| # | Acción terminal |
|---|---|
| T04 | `seed:company-rules --matrix-hash <hash>` por workflow ADR-022 (borrador→revisión→aprobación→activación); verificar `GATE_NO_COVERAGE`/`GATE_NO_RDF`. Límite 06-nov. |
| T05 | 30 dorados (semilla Q-07 + ~21 nuevos) firmados Opción 1 (`modules/goldens/sign.ts`, UI `/dorados`); `goldens:check` + gate verdes, 0 omitidos. Si se exige DB: ADR-035 + migraciones 0024–0027 antes. |
| T06 | `g8:calibrate` con RDF G8 → método/etapa únicos; tolerancia única en `CHECK`/`summary`/`excel-compare`. |
| T07 | G2 consume eventos + ADR-033 (NC resta/elegibles + migración `voided_at/reason/replaces_id`); revalidar dorados/libros. |
| T08 | `catalog:load` + modo Z con M-1/M-2; T09 Excel plantilla + paridad art. 16 con M-4. |
| T10 | Mes real M2/M5 (`period-reconciliation`, D1–D5 en 0). |
| T11 | UAT + `acta-aceptacion.md` + `acceptance:gate --profile=golive` verde → GO. |
| Plan B | Cada T exige la anterior; no hay atajo. Si M-1…M-4 no llegan: T08/T09/T10 esperan con acta de falta. |

## 5. Repo (dueño del repo · límite: esta semana)

| # | Acción terminal |
|---|---|
| Commits | Hay ~30 archivos modificados sin commitear (Fase 0 + Q-05). GIT-01 exige orden explícita del dueño + escáner limpio (`secrets:scan` + hook con `docs:verify-schema`, ambos verdes). Pedir la orden con este documento. |
| Plan B | Sin orden no se commitea; el trabajo queda en workspace con este tablero como índice. |

## 6. Cartas listas para enviar (rellenar blancos y enviar)

### 6.1 Seguimiento F0-01 + convocatoria sesión (a contador)

> Asunto: F0-01 + sesión de firma 60–90 min (7 decisiones + G4)
>
> El 2026-10-05 enviamos F0-01 (18+5 preguntas + M-1…M-4). Acuse pendiente.
> Proponemos sesión única de 60–90 min antes del 23-oct para firmar 7 decisiones
> (G8, G2, ADR-033, G9, G1, base ISLR) + 1 frase G4. Llevamos los 7 borradores
> cargados con cifras del sistema; usted solo revisa, aprueba o devuelve, firma
> y vincula. Sin esta sesión no podemos activar reglas (el sistema lo impide
> por diseño) y la meta de matriz 06-nov cae. Confirme fecha: ___.

### 6.2 Reclamo M-1…M-4 (a cliente, con copia a contador)

> Asunto: Muestras M-1…M-4 — vencen 16-oct (bloquean mes real y go-live)
>
> Faltan: M-1 CSV ≥1 mes parseable · M-2 ≥1 Z por máquina · M-3 libros del mismo
> período · M-4 XLSX. Nuestro intake está verificado (10/10 y 0 `#REF!` en
> pruebas). Sin muestras no hay T10 (mes real = Excel) ni T11. Si algo no existe
> (p. ej. sin Z porque no hay máquina), fírmelo como acta de falta y seguimos
> con lo que haya. Fecha límite: 16-oct.

### 6.3 G4 por defecto (solo si cliente no responde B2, dueño decide)

> `G4 diferido formalmente en v1 el 2026-__-__ por ___ (dueño, ante silencio del
> cliente desde 2026-10-01). v1 opera solo en VES (el sistema no convierte ni
> valida tasa: `currency` queda en VES y `fx_rate` no existe); documentos en
> divisa quedan fuera de alcance hasta v2 con ADR-013.` — Firmar como decisión
> del dueño, no fiscal. El contador la refrenda cuando aparezca.
