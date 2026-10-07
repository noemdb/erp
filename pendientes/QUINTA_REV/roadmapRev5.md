# ROADMAP DE IMPLEMENTACIÓN — QUINTA REVISIÓN
## ERP-TributarioLite — De "el sistema funciona" a "las decisiones están firmadas"

**Fecha:** 2026-10-07
**Predecesor:** `pendientes/CUARTA_REV/roadmapRev4.md` (05-oct), `consolidado-docs-2026-10-05.md`,
`siguientes-pasos-sesion-6-pasos.md`, `decisiones/`, `diff/index.md`, `taskIN/CONSOLIDADO-TASK.md`.
**Objetivo:** cerrar la brecha entre la simulación que funcionó y la firma que falta, y eliminar
la mentira documental que queda entre `docs/` y el código.

---

# 1. Por qué una quinta revisión

La cuarta revisión (05-oct) cerró con una promesa sin condiciones: "no más rondas de documentación".
Su §22 lo dijo bien: la siguiente actividad debía ser una sesión práctica, no otra revisión.

Se hizo, y salió bien. El 06-oct:

- La simulación de 6 pasos corrió sobre el sistema real: carga → NC → pago → agente → preview → bitácora.
- Se encontró, en vivo, el caso G8 con diferencia de **0,01** que ningún diseño podía predecir.
- Se implementó el RDF en sistema (ADR-034): entidad inmutable, vínculo a regla, gate `GATE_NO_RDF`.

Eso es todo lo que la cuarta revisión produjo. Y es mucho. Pero también dejó un saldo que
esta revisión tiene que pagar:

| Lo que la cuarta dejó | Para qué |
|---|---|
| 7 RDF redactados en `decisiones/`, **0 firmados** | La infra existe; falta el acto |
| Parches de alineación docs-código en `diff/index.md`, **0 aplicados** | La spec miente sobre el código |
| Semilla de 17 dorados + ISLR/ABONO, truncada a la mitad | No se puede cerrar F2 |
| G4 explícitamente ambiguo en su §14 | "No dejar G4 en un estado ambiguo" sigue sin cumplirse |
| Tablero semanal propuesto, sin existir | Sin control de desvío no hay plano |

**Esta revisión no propone features. Propone cerrar, firmar y dejar de mentir.**

---

# 2. Principio de la quinta revisión

> **La especificación describe el sistema que existe, no el sistema que se planea.**

Diferencia con las revisiones anteriores, que escribían el destino antes del camino. Aquí el
orden es el inverso: verificar el código, corregir la spec, y solo después pedir firmas.

Corolarios:

1. Cada afirmación de esta revisión con `verificado` fue comprobada contra el repo el 10-07.
2. Un hallazgo que no se puede verificar en el repo no se afirma: se marca `a verificar`.
3. Toda corrección de spec es un bloque con checklist, no un afterthought.

---

# 3. Estado de partida (verificado 2026-10-07)

## 3.1 Lo que funciona

52 archivos de test en 18 módulos · migraciones 0000–0023 · motor puro y versionado ·
multiempresa con RLS · import por staging · retenciones IVA/ISLR · libros, resumen, conciliación ·
cierre con `closure_hash` · auditoría append-only · Playwright 6/6 + P0 14/14 ·
RDF en sistema con gate fail-closed · escáner de secretos y purge `serverc` cerrados.

## 3.2 Lo que impide declarar "listo"

`npm run acceptance:gate --profile=golive` → **NO-GO**, hoy, en esta máquina.

| Bloqueo | Dueño | ¿Depende de alguien fuera? |
|---|---|---|
| 7 RDF sin firmar (G1/G2/G8/G9 + G4 + ADR-033 + base ISLR) | contador | **Sí** |
| Matriz v1 sin firmar | contador | **Sí** |
| Dorados 0/30 | contador | **Sí** |
| M-2 (Z real) sin muestra, límite 16-oct | cliente | **Sí** |
| M-4 (XLSX golden) sin validar | cliente | **Sí** |
| Spec desalineada del código (Q-01…Q-07) | nosotros | **No** |
| Alícuota en dos escalas (§5.4 consolidado) | nosotros | **No** |
| Rotación de secretos sin ejecutar (T12) | nosotros + servidor | Parcial |
| Restore drill sin ejecutar (T13) | nosotros | **No** |

**Regla de esta revisión:** cada fila de "no" es trabajo que se puede hacer esta semana sin
pedirle nada a nadie. Ese es el objetivo.

---

# 4. FASE A — Cerrar la mentira documental (sin dependencias externas)

## A1. T14 — Alineación docs-código, completa

**Por qué va primero:** mientras la spec diga "Auth.js" y prometa columnas que no existen,
cualquiera que lea `docs/` antes de tocar el código toma decisiones equivocadas. Es el defecto
más barato de arreglar y el más caro de ignorar.

Los parches ya están escritos en `CUARTA_REV/diff/index.md §A`. Aplicar y verificar:

| Doc | Corrección | Verificación |
|---|---|---|
| `ARCHITECTURE.md:25` | Auth → "Sesiones DB propias (ADR-030), Argon2id, recuperación asistida" | Contradice ADR-030, que está aceptada |
| `ARCHITECTURE.md:65,227` | Mermaid: quitar `pg-boss` como capacidad actual | ADR-031 lo diferenció |
| `ARCHITECTURE.md:157` | Ya está correcto (dice `render:retry`) | — |
| `API.md:116` | Ya está correcto | — |
| `API.md:163` | "PDF vía HTML→Chromium en worker" → ejecutor `render:retry` + gatillos | ADR-031 |
| `DATABASE.md` | Corregir tablas §5.1 del consolidado | Verificación automática snapshot↔doc |

**Aceptación:** `docs/DATABASE.md` y el snapshot 0021 coinciden columna por columna en las tablas
`purchase_documents`, `payments`, `attachments`, `sales_documents`. Script de verificación en
`scripts/` para que no vuelva a pasar (esta revisión lo ejecutó a mano; debe ser repetible).

## A2. Alícuota: una sola escala

**El defecto.** `purchase_document_lines.tax_rate` guarda fracción en import (`0.160000`) y
porciento en manual (`"16"`). El motor lo trata como fracción (`b.times(l.taxRate)`). Hoy no
explota porque el motor solo corre sobre dorados y la validación de Inv.1 suma el IVA capturado,
pero el primer consumidor real de `tax_rate` explota.

**Por qué no requiere al contador.** La ENMIENDA E-2 ya cerró el contrato: porcentajes como
fracción string. Aplicarlo en el borde manual no es una decisión fiscal nueva.

**Dos opciones, y por qué una:**

| Opción | Descripción | Veredicto |
|---|---|---|
| Normalizar al escribir | Dividir por 100 en la acción manual | Introduce `16/100 = 0.16` con pérdida conceptual; el usuario sigue escribiendo `16` |
| **Rechazar escala inválida** | `taxRate` fuera de `[0,1]` → `RATE_SCALE_INVALID` con mensaje que diga "la alícuota va como fracción: `0.16`" | **Preferida**: hace visible la convención en el error, no la esconde |
| Aceptar ambas y normalizar | Detecta escala por magnitud | Rechazada: adivina en silencio |

**Aceptación:** Zod rechaza `16` en la línea gravada; el formulario muestra el formato esperado;
test que fije la convención y test de regresión con `0.16`; CHANGELOG con la convención escrita.

## A3. Higiene de referencias

- `CUARTA_REV/consolidado-docs-2026-10-05.md:198,225` → apunta a `taskIN/T01–T15` y `00-INDICE.md`
  que no existen. Corregir a `taskIN/CONSOLIDADO-TASK.md`.
- `diff/index.md` está truncado a mitad de la semilla de dorados. Completar o marcar el corte.
- `CUARTA_REV/consolidado` §8 dice "ADR-001–032" → 034.

**Aceptación:** cero rutas rotas en `pendientes/**` verificadas con enlace relativo.

## A4. Tablero semanal (T15)

Plantilla en `diff/index.md §B`. Copiada a `seguimiento/tablero-semanal.md` con la primera
edición rellenada al 10-07 y las métricas ya medidas: 0/7 RDF, 0/30 dorados, 6 tablas desalineadas,
77/78 tests.

**Aceptación:** un archivo, una tabla, fecha de la próxima edición.

---

# 5. FASE B — Cerrar las decisiones (dependencia externa,Dueño: contador)

## B1. Convertir 7 borradores en 7 RDF firmados

La cuarta revisión dejó el trabajo hecho: `decisiones/pool-datos-decisiones.md` tiene los 7 casos
con pregunta, opciones, impacto numérico y cobertura. `pool-completar-borrador.md` tiene decisión,
fundamento, ejemplo y resultado esperado. La quinta revisión aporta el paso que faltaba: **el
recorrido por la UI**, porque la infra ya está y el camino exacto no estaba escrito.

Ver `decisiones/ruta-firma-rdf.md` (paso a paso, con los IDs de la sim #2 como cifras reales).

Los 7, con su bloqueo asociado:

| # | RDF | Pregunta | Cierra | Cifra de la sim |
|---|---|---|---|---|
| 1 | G8 redondeo | ¿Por línea o por total? | ADR-014 | 1.179,12 vs 1.179,11 |
| 2 | G2 abono | ¿Qué fecha dispara? | G2-a | pago 06-09 × 1.500 |
| 3 | G9 serie ISLR | ¿Mensual o anual? | G9 | `ISLR-AAAAMM-######` provisional |
| 4 | G1 período | ¿Mensual o quincenal? | G1 | período 01-09 → 01-10 |
| 5 | Base ISLR | ¿Con o sin IVA? | F2/F4 | 900,00 → 306,00 |
| 6 | G4 moneda | **¿A: diferir, o B: incluir?** | ADR-013 | sin datos |
| 7 | ADR-033 NC | ¿Resta en agregados? | ADR-033 | NC 001-00004 sumando |

**Gate B1:** los 7 con estado APROBADO/MODIFICAR/PENDIENTE, fecha y firmante. MODIFICAR es
válido y útil: significa que el contador cambió algo y hay que reprograbar.

## B2. Cerrar la ambigüedad de G4 — la decisión de esta revisión

`roadmapRev4 §14` identificó el problema y lo dejó abierto: G4 es bloqueo activo, pero ninguna
tarea lo resuelve. Exigía decidir A o B. Cuatro meses de ambigüedad después, sigue sin dueño ni fecha.

**Esto no se resuelve con un RDF. Se resuelve con una frase.**

| Opción | Qué significa | Costo |
|---|---|---|
| **A — Diferir formalmente** | Divisas en VES en v1; FX queda en v2 con ADR-013 reopening | Cero código. Se saca G4 de los bloqueos de go-live |
| B — Incluir en v1 | Tasa BCV con fecha y tipo definidos, diferencias cambiarias, casos, dorados | 5–8 días + decisión fiscal + fixtures |

**Recomendación de esta revisión: A.** Motivo, sin adornos: las facturas del cliente en el mes de
muestra están en VES; la sim no encontró ninguna documento en divisa; y la Opción B exige definir
fecha y tipo de tasa BCV, que es material de un contador, no de una roadmap. Diferir G4 es una
decisión legítima y **escrita**; dejarlo ambiguo no lo es.

**Aceptación:** una línea en `docs/TODO.md` (bloqueos) y `docs/DECISIONS.md` que diga "G4
diferido formalmente en v1, ADR-013 permanece bloqueada para v2", con fecha y firmante.

## B3. Sesión 1 formal (T03)

`roadmapRev4 §6` la diseñó con 11 bloques; la sim del 06-oct hizo 6 pasos. La diferencia importa:
**los 5 bloques no ejecutados son los que más información dan.** Registrar la diferencia.

| Bloque | Sim 10-06 | Falta |
|---|---|---|
| 1–6 (contexto, empresa, compra, IVA, ISLR, abonos) | ✅ | — |
| 7 ventas + NC/ND + Z | 🟡 | NC summing sign check (ADR-033) |
| 8 importación + staging | ✅ | — |
| 9 libros + Excel + conciliación | 🔴 | **Nunca se ejecutó con datos reales** |
| 10 cierre + reapertura | ✅ | — |
| 11 decisiones + firma | 🔴 | **Nunca hubo firma** |

**Aceptación:** bloques 7 y 9 ejecutados; bloque 11 con RDF firmados; ficha de evidencia por caso
(`roadmapRev4 §17`) completa con IDs y SHA-256.

---

# 6. FASE C — Cierre mecánico (post-firma, ya desbloqueado por ADR-034)

Estas tareas siguen bloqueadas por firma, pero la infra de RDF las dejó prepared:

| Tarea | Depende de | Qué ya está listo |
|---|---|---|
| T04 matriz v1 | B1 | `seed:company-rules` con `--matrix-hash`; workflow borrador→activo (ADR-022) |
| T05 dorados | T04 | `fixtures/tax-scenarios/schema.json`, firma ligada a `sha256` (ACC-02), `_manifest.umbralGolive=30` |
| T06 redondeo | RDF G8 | `tax-engine/calibrate.ts` (`g8:calibrate`, 8 combinaciones método×etapa) |
| T07 G2 + ADR-033 | RDF G2 + firma 033 | migraciones 0011/0012; `g2:divergence` |
| T08 catálogos/Z | T04 + M-1/M-2 | `import:autodetect`, `catalog:load` |
| T09 Excel/paridad | M-4 | `golden:inspect`, `golden:compare` (bitácora D1–D5) |
| T10 mes real | T02+T04+T05 | `acceptance/period-reconciliation/` |
| T11 UAT/go-live | T10 | `docs/uat/`, `docs/manuales/`, `acta-aceptacion.md` |

**Nota sobre T05:** la semilla de dorados está en 17 candidatos + ISLR-07/ABONO-01…03, pero
`diff/index.md §D` está truncado y `ISLR-09` fue corregido (base 900 → 306,00) sin verificación
del contador. **Completar la semilla antes de la sesión** es trabajo nuestro, no suyo.

---

# 7. FASE D — Hardening paralelo

| ID | Qué | Bloque | Ahorro |
|---|---|---|---|
| T12 | Rotación de secretos (DB owner, `app_runtime`, `AUTH_SECRET`, `FILE_SIGNING`, storage, seeds) + tabla §6 firmada | `runbooks/incidente-serverc-2026-10-04.md` §1+§3+§6 accionables; §6 con 2 filas `pendiente` | Evitar repetir el incidente `serverc` |
| T13 | `DB_LEAST_PRIVILEGE=true` en staging + restore drill con RPO/RTO | `create-app-role.mjs` existe; TST-01 falla hoy por credencial del entorno | Desbloquear TST-01, subir 78/78 |
| — | E-3 (`origin` en schema) | Verificado: **no existe** columna `origin`; el seeder usa `--matrix-hash` + flag `synthetic`. Deuda resuelta por la vía actual | Cerrar la pregunta de la ENMIENDA |

**Nota sobre TST-01:** el único test rojo (77/78) es la credencial `app_runtime` del entorno
local, no un defecto. T13 lo resuelve de verdad.

---

# 8. Orden recomendado

```text
SIN DEPENDENCIA EXTERNA (esta semana)
  A1 T14 alineación      ─┐
  A2 alícuota una escala  ├─→ Q-01…Q-07 cerrados
  A3 higiene referencias  │
  A4 tablero T15         ─┘
  D  T12/T13/E-3 (si hay servidor)

CON DEPENDENCIA EXTERNA (contador/cliente)
  B1 7 RDF firmados      ─┐
  B2 G4: A o B (frase)   ├─→ T04 → T05 → T08/T09 → T10 → T11
  B3 Sesión 1 (bloques 7, 9, 11) ─┘
```

**Regla:** A y D no dependen de nadie. Si B no avanza, A y D siguen siendo entregables.
Eso es exactamente lo contrario de la cuarta revisión, donde todo el trabajo era bloqueado
por el contador y el equipo quedó esperando.

---

# 9. Gate de la quinta revisión

No es un gate de go-live (ese es `go-live-checklist.md`). Es el gate de **coherencia**:

```text
[ ] A1: docs/ no contradice el código (verificación automática disponible)
[ ] A2: una sola escala de alícuota, con convención escrita y test que la fije
[ ] A3: cero rutas rotas en docs/ y pendientes/
[ ] A4: tablero semanal existe con primera edición
[ ] B1: 7 RDF con estado formal (APROBADO/MODIFICAR/PENDIENTE) + fecha + firmante
[ ] B2: G4 decidido por escrito (A o B), no ambiguo
[ ] B3: bloques 7, 9 y 11 de la sesión ejecutados con evidencia
```

**Criterio final** (mismo patrón de `roadmapRev4 §21`, cinco preguntas, sin autoengaño):

1. ¿La especificación describe el código que existe?
2. ¿Las decisiones fiscales están escritas y firmadas?
3. ¿El sistema reproduce los dorados del contador?
4. ¿Se reprodujo un período real contra los libros del contador?
5. ¿Hay evidencia para operar?

Al 10-07 la respuesta honesta es: **1 no · 2 no · 3 no · 4 no · 5 parcial**.
Las preguntas 1 a 5 las puede responder el equipo salvo la 3 y la 4.

---

# 10. Lo que esta revisión NO hace

- **No inventa reglas fiscales.** Ninguna cifra, tasa, fecha de vigencia o criterio de redondeo
  nuevo. Todo lo numérico viene de la sim #2, verificada.
- **No toca el motor sin firma.** `round2` sigue provisional; `tax-engine` no se altera más que
  el filtro de escala de A2, que no cambia el cálculo.
- **No declara go-live.** El gate sigue en `go-live-checklist.md` y en `acceptance:gate`.
- **No reescribe `roadmapRev4`.** Predecesor, no versión corregida: lo que la cuarta revisión
  dijimos y no hicimos queda anotado en `consolidado-docs-2026-10-07.md §4`.