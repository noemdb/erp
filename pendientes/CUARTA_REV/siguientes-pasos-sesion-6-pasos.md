# Siguientes pasos tras la Sesión Práctica de 6 pasos — CUARTA_REV

> **Fecha:** 2026-10-06
> **Estado:** Sesión práctica ejecutada, resultado OK en simulación de 6 pasos
> **Fuentes:** `pendientes/CUARTA_REV/roadmapRev4.md` (§19 Sprint 2, §22), `pendientes/CUARTA_REV/taskIN/CONSOLIDADO-TASK.md` (T04–T15), `docs/TODO.md`, `docs/DECISIONS.md` (ADR-014, ADR-021, ADR-033 propuesta), `blueprint/datos/casoUso003/retrospectiva-sim2.md`
> **Lectura:** este archivo es guía operativa. La fuente de verdad sigue siendo `docs/`.

La sesión práctica de 6 pasos demostró que el sistema **funciona en el camino feliz**:
cargar, crear la NC, registrar el pago, activar al agente, previsualizar IVA/ISLR y
revisar la bitácora. Eso es Sprint 1 (T03) en verde a nivel operativo.

Pero "funciona en simulación" no es "listo para operar". El roadmap exige una
cadena completa antes de hablar de go-live:

```text
decisión fiscal → implementación → prueba dorada → prueba operativa → evidencia → aceptación
```

Este documento explica, muy despacio, los **dos puntos** que siguen:

1. **Punto 1 — Cerrar la sesión en papel** (sin esto no hay código fiscal).
2. **Punto 2 — El orden de lo que viene después** (T04 → T06/T07 → T05 → T08/T09 → T10 → T11, más T12–T15 en paralelo).

---

## Punto 1 — Cerrar la sesión en papel: de "lo vimos funcionar" a "quedó decidido y firmado"

### 1.1 Por qué este punto existe y por qué va primero

Durante la simulación vimos pantallas y números. Eso es muy valioso, pero tiene
un límite: lo que se dice de palabra se olvida, se interpreta de dos maneras
distintas, o cambia la semana siguiente.

Por eso la regla de la cuarta revisión es dura y simple:

> **Nunca interpretar una conversación verbal como autorización para cambiar el motor fiscal.**

El motor fiscal es la parte del sistema que calcula base, IVA y retenciones.
Si alguien cambia un porcentaje, una base o un redondeo sin una decisión
escrita, el libro puede quedar fiscalmente incorrecto y nadie podrá demostrar
por qué se calculó así.

Cerrar la sesión en papel significa convertir cada "lo vimos y estamos de
acuerdo" en un **RDF — Registro de Decisión Fiscal**: una hoja de una página
por cada tema fiscal, con fecha, datos, decisión y firma.

Sin RDF no hay código. Esa es la puerta T03 → T04.

### 1.2 Qué es un RDF, campo por campo, explicado despacio

Un RDF tiene 15 campos mínimos (`roadmapRev4.md` §5 C1). Los recorremos uno por
uno, sin prisa:

1. **RDF-ID.** Un código único, por ejemplo `RDF-G8-001`. Sirve para citar la
   decisión meses después: "esto se calculó así por RDF-G8-001".
2. **Fecha.** El día en que se decidió. Las reglas fiscales tienen vigencia
   (desde cuándo aplican), así que la fecha no es adorno.
3. **Caso.** Qué historia concreta se usó. No "el redondeo en general", sino
   "la compra 004-00099 con base 1.572,15 y retención 75 %".
4. **Datos de entrada.** Los números exactos que se metieron: base, alícuota,
   montos por línea. Si los datos cambian, el resultado puede cambiar; por eso
   se congelan aquí.
5. **Pregunta.** La duda fiscal en una frase. Ejemplo: "¿el 75 % se redondea
   línea por línea y luego se suma, o se suma primero y se redondea el total?".
6. **Alternativas consideradas.** Qué opciones había sobre la mesa. En el
   ejemplo: Opción A redondeo por línea, Opción B redondeo por total. Se
   escriben las dos para demostrar que se eligió, no que no se pensó.
7. **Decisión.** Una sola frase clara. "Se redondea por línea con HALF_UP a 2
   decimales y luego se suma".
8. **Fundamento aportado por cliente/contador.** Por qué se decidió así: norma,
   criterio del contador, práctica del escritorio. No es "porque el sistema lo
   hace así"; es al revés: el sistema lo hará así porque el contador lo decidió.
9. **Fórmula.** La cuenta escrita como fórmula. Ejemplo:
   `retenido = redondeo2(base_linea × 0.75) sumado por línea`.
10. **Redondeo.** Método, etapa y precisión. Método (HALF_UP, etc.), etapa
    (por línea o por total), precisión (2 decimales en bolívares). Este campo
    hoy está vacío a nivel general — es el bloqueo G8.
11. **Momento fiscal.** Qué fecha manda: documento, recepción, pago, abono en
    cuenta, emisión. Clave para G2 (pago vs abono, lo que ocurra primero).
12. **Ejemplo numérico.** La cuenta hecha a mano con el resultado esperado.
    Ejemplo real de la sim #2: `75 % × 1.572,15 = 1.179,1125` → por total daría
    `1.179,11`; por línea el motor dio `1.179,12`. Diferencia `0,01`. Ese
    `0,01` es exactamente lo que el contador debe arbitrar.
13. **Resultado esperado.** El número final con 2 decimales que el sistema
    deberá reproducir byte por byte en los dorados.
14. **Regla afectada.** Qué tabla de reglas toca (IVA 75 %, concepto ISLR, etc.)
    y qué vigencia tendrá.
15. **Impacto en sistema + Responsable + Firma/acuse.** Qué hay que programar o
    configurar, quién aprueba y cómo consta (firma, correo, acta). Sin firma es
    borrador, no decisión.

### 1.3 Los RDF concretos que esta sesión debe dejar

La agenda Tier A (`CONSOLIDADO-TASK.md` T03) pedía, como mínimo:

| RDF | Pregunta que debe quedar cerrada | Evidencia que ya tenemos de la sim |
|---|---|---|
| G8 redondeo | Método, etapa (línea vs total), precisión final. Cierra ADR-014 | `1.179,12` por línea vs `1.179,11` por total, dif. `0,01` (`retrospectiva-sim2.md` §hallazgo 2) |
| G2-a/b/c/d abono | Qué asiento acredita abono, qué fecha manda, cómo se atribuye base por porción, cómo va el sustraendo ISLR en parciales | Evento `Pago 06-09-2025 × 1.500` asignado a `004-00099`, preview dual ISLR 6/6 `Divergen — sin regla vigente` |
| Base ISLR + UT | Base con o sin IVA, UT aplicable, mínimos | Barrido `HON COM ALQ PUB TRA SER` sin regla — pendiente de matriz |
| G9 series | Formato y reinicio de serie ISLR (+ cotejo reinicio IVA) | Serie provisional `ISLR-AAAAMM-######`, sin formato aprobado |
| G1 período | Mensual vs quincenal por empresa | Período `01-09-2025 → 01-10-2025` usado en sim |
| G4 moneda | Incluido o diferido formalmente de v1 (roadmap §14 exige decidir A o B, no dejarlo ambiguo) | Base VES, referencia USD, tasa BCV sin fecha/tipo definidos |
| ADR-033 NC | NC resta en libro/resumen/conciliación; elegibles solo facturas; `voided_at/reason/replaces_id` | NC `001-00004` sumando en vez de restar + aparece como elegible para retención (hallazgo 3) |

Cada fila de esa tabla debe terminar en un estado formal: **APROBADO /
MODIFICAR / PENDIENTE**, con fecha y firmante. "APROBADO de palabra" no cuenta.

### 1.4 Evidencia por caso y registro de incidencias

Además del RDF, cada uno de los 6 pasos de la simulación debe conservar su
ficha (`roadmapRev4.md` §17):

```text
Caso / Actor / Empresa / Período / Datos de entrada / Regla / rule_version_id /
Resultado esperado / Resultado obtenido / Diferencia / Capturas /
ID documento / ID evento / ID comprobante / SHA-256 / Auditoría /
Estado / Aprobador / Fecha
```

Y las incidencias en su tabla (`roadmapRev4.md` §18):

| ID | Caso | Severidad | Esperado | Obtenido | Acción | Responsable | Estado |
|---|---|---|---|---|---|---|---|
| INC-001 | | P0/P1/P2/P3 | | | | | |

Severidad, despacio:

* **P0:** impide operar o da resultado fiscal incorrecto. Bloquea go-live.
* **P1:** rompe función crítica sin alternativa aceptable. Bloquea go-live.
* **P2:** defecto con workaround. Requiere decisión explícita para pasar.
* **P3:** cosmético/documental. Puede ir a backlog post-go-live.

Gate de salida del Punto 1: **no continuar a reglas definitivas si hay pregunta
fiscal crítica en ambiguo** (Gate A1). Dicho de otro modo: si G8 o G2 siguen en
PENDIENTE, T04 no empieza.

---

## Punto 2 — El orden de lo que viene después, paso a paso y sin saltos

### 2.1 La idea general, dicha despacio

Una vez firmados los RDF, el trabajo se divide en tres carriles que avanzan en
un orden preciso. La imagen mental es un embudo: primero se fijan las reglas,
luego se programan, luego se prueban con datos reales, y al final se acepta.

```text
T01 (pedido F0-01, ya enviado)
 ↓
T03 (sesión — acabamos de salir de aquí) ──┐
 ↓                                          │
T04 (matriz firmada)                        │
 ↓                                          │
T05 (dorados firmados)                      │
 ↓                                          │
T08 ──┐                                     │
T06 ──┤                                     │
T07 ──┤                                     │
T09 ──┤                                     │
      ↓                                     │
     T10 (mes real + M5) ←──────────────────┘
      ↓
     T11 (UAT + cutover + go-live)
      ↓
   GO-LIVE
```

En paralelo, sin esperar a los RDF: T02 (muestras), T12 (secretos), T13
(least-privilege + restore), T14 (docs-código), T15 (tablero).

Vamos tarea por tarea, despacio.

### 2.2 T04 — Matriz de reglas v1 firmada (dueño: contador, meta 06-nov, ⛔ tras T03)

**Qué es.** La tabla madre de todas las reglas fiscales: cada concepto IVA/ISLR
con porcentaje, base, UT/sustraendo, vigencia, condición y fuente. Vive en
`matriz-reglas-v1.md` (hoy borrador).

**Cómo se carga.** Por workflow `borrador → en_revisión → aprobado → activo`
(ADR-022), nunca editando el seeder. Activar trunca la vigencia anterior y la
marca `superseded`; jamás se reescribe la historia.

**Por qué va antes que programar.** Porque programar contra una regla no
firmada es construir sobre arena: si la tasa cambia después, hay que reprogramar
y re-probar todo.

**Gate.** ACC-03 fail-closed: lo no sintético solo activa con cobertura de
dorados. Desbloquea T05, T08, T10.

### 2.3 T06 — Redondeo + tolerancia única (⛔ tras RDF G8)

**Qué es.** Convertir la decisión G8 en código y en un solo criterio de
tolerancia. Hoy conviven dos: `0.01` provisional en DB/resumen y `0` como meta
Inv.8 en `DOMAIN`. Hay que unificar.

**Entregables, despacio:** ADR-014 actualizado, retirar `round2` provisional,
tolerancia única en `CHECK` y conciliación, tests, dorados G8 verdes,
`g8:calibrate` limpio (el calibrador que prueba 8 combinaciones de método/etapa).

**Por qué importa.** La sim demostró que la etapa cambia el centavo
(`1.179,12` vs `1.179,11`). En un mes de 100–200 documentos, esos centavos
rompen la paridad Excel vs sistema (D1–D5) y bloquean M5.

### 2.4 T07 + ADR-033 — G2 + IVA consume eventos + signo de NC (⛔ tras RDF G2 + firma ADR-033)

**Qué es, en tres partes lentas:**

a) **Criterio configurado.** `companies.abono_criterion` (`unset` fail-closed
   por defecto, solo el contador lo cambia con motivo auditado). Preview dual
   que compara evento/fecha/período/regla/base/sustraendo bajo `payment_only`
   y `account_credit_or_payment`.
b) **IVA consume `settlement_events`.** Hoy solo ISLR usa eventos; IVA aún no.
   Hay que conectar el motor IVA a los eventos pago/abono con asignación.
c) **ADR-033 (propuesta 05-oct).** NC (`credit_note`) resta en
   `getPurchaseBook`/`getIvaSummary`/`getConciliation`, ND suma;
   `listEligiblePurchases` excluye NC/ND (solo `invoice` con IVA > 0 entra a
   retención); migración aditiva `voided_at + void_reason + replaces_id` en
   `purchase_documents` (y revisar `sales_documents`).

**Aceptación.** Preview dual converge, `g2:divergence` limpio, ABONO-01…03
verdes, libro con 9F+1NC restando bien, preview IVA sin NC elegible.

**Límite.** Hasta la firma, libros/resumen/conciliación se marcan
**provisionales** y no habilitan cierre/M5.

### 2.5 T05 — Dorados 30–50 firmados (⛔ tras T04, desde 09-nov, 10/semana)

**Qué es.** Los casos de prueba fiscales con entradas congeladas, resultado
esperado, regla, versión, explicación, SHA-256 y firma. Protocolo a ciegas en
`fixtures/`, firma ligada al hash; `goldens:check` + `acceptance:gate` verifican.

**Semilla.** 17 candidatos + ISLR-07/ABONO-01…03 (`diff/index.md` §D). Cada
candidato debe convertirse en reproducible antes de contar para los 30.

**Gate.** 100 % verde o F2 no cierra; 30 + M5 → cutover.

### 2.6 T08 — Catálogos + modo Z + perfiles (⛔ T04 / M-1…M-2) y T09 — Excel + paridad (⛔ M-4)

**T08, despacio.** Cargar valores reales de catálogos por lotes, Z con mes real
por sucursal sin duplicidad, perfiles de mapeo solo si `autodetect` lo exige
(gatillo 1 ya visto en Z sintéticas). Aceptación: caso real + contador.

**T09, despacio.** Mapa de celdas contra el golden, generadores sobre la
plantilla original, paridad art. 16; menores: `summary/v1`, `pdf_sha256` ISLR,
tablero pendientes UI. Aceptación: L1–L4 en CI + D1–D5 sin abiertas.

**Por qué van juntas.** Sin Z real no hay Libro de Ventas real; sin plantilla
real no hay Excel fiel. Ambas esperan muestras M-1…M-4 (límite 16-oct).

### 2.7 T10 — Mes real + M5 + sombra (⛔ T02+T04+T05) y T11 — UAT + cutover + go-live (⛔ tras T10)

**T10.** Un período real completo en paralelo: ERP vs Excel/libros del contador.
Se registran totales (documentos, bases, IVA, retenciones, libros), diferencias
D1–D5, aprobadas vs abiertas. **Gate: D1 abiertas = 0**, M2/M5 firmados.

**T11.** Ceremonia de aceptación, no descubrimiento. Entrada: T04 firmado, 30
dorados mínimo, M5 firmado, D1 = 0, T12/T13 según riesgo, docs al día,
checklist verde. Ejecución: UAT por rol (UAT-01–20), multiempresa, RBAC, drill
RPO/RTO, ORR, cutover, smoke test. Salida: `ACTA-ACEPTACION.md` firmada.

### 2.8 Carril paralelo — T02, T12, T13, T14, T15 (sin dependencia externa, hacer ya)

* **T02 Muestras M-1…M-4** (límite 16-oct): M-1 CSV ≥ 1 mes parseable por
  `import:autodetect`; M-2 ≥ 1 Z por máquina con rango/salto; M-3 libros mismo
  período; M-4 XLSX con `exceljs` sin PII.
* **T12 rotación secretos:** DB owner/app_runtime, `AUTH_SECRET`,
  `FILE_SIGNING`, almacenamiento, seeds; clave vieja rechazada; tabla §6 firmada.
* **T13 rol mínimo + restore drill:** `DB_LEAST_PRIVILEGE=true` en staging,
  drill real con RPO/RTO registrados.
* **T14 alineación docs-código (0.5–1d):** `ARCHITECTURE` (auth propio, render
  fuera TX, pg-boss diferido), `API` (render diferido), E-3 `origin` en schema
  o migración; guardia prod con `--matrix-hash`.
* **T15 tablero semanal:** firmadas÷requeridas, dorados÷30, cobertura reglas,
  incidentes, desvío real, spillover S1→S2. Primera edición al cierre de H0.

---

## Checklist de salida de este documento

**Punto 1 cerrado cuando:**
- [ ] Cada RDF G1/G2/G8/G9 (+ G4 A/B + ADR-033) tiene decisión, ejemplo numérico y firma.
- [ ] Cada paso 1–6 tiene su ficha de evidencia con IDs + SHA-256 + auditoría.
- [ ] Incidencias P0/P1 = 0 abiertas (o decisión explícita para P2).

**Punto 2 arranca cuando:**
- [ ] T04 recibe los RDF y abre la matriz v1.
- [ ] T06/T07 reciben RDF G8/G2 (+ firma ADR-033) y programan.
- [ ] T05 convierte la semilla en 30 dorados firmados.
- [ ] T10/T11 solo con D1 = 0 + M5 + acta.

Si alguna respuesta a las 5 preguntas finales es "no" (¿reglas firmadas?,
¿dorados reproducidos?, ¿período real reproducido?, ¿usuarios lo demuestran?,
¿evidencia para operar?), el estado sigue siendo **IMPLEMENTACIÓN EN
VALIDACIÓN**, no "LISTO" (`roadmapRev4.md` §21).
