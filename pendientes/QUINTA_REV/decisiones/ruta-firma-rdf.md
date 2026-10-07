# Ruta de firma RDF — de 7 borradores a 7 decisiones

> **Qué es esto.** La cuarta revisión dejó los 7 casos redactados en `pool-datos-decisiones.md`
> (Paso 1) y `pool-completar-borrador.md` (Paso 2). Lo que faltaba era el paso 3: **recorrer la
> UI hasta la firma**, que no está escrito en ningún lado y que nadie ha ejecutado de punta a
> punta con un firmante.
> **Estado:** los 7 están en `draft`. Firmados: 0. Verificado 10-07.
> **Infra:** ADR-034 aceptada e implementada — migración 0023, módulo `rdf`, UI `/decisiones`,
> gate `GATE_NO_RDF`. Verificado: `src/modules/rdf/`, `src/db/schema/rdf.ts`,
> `src/modules/rules/activation-gate.ts:57`.
> **Fuente de cifras:** `blueprint/datos/casoUso003/retrospectiva-sim2.md` (sim del 06-oct, lote
> `9740a7bd`). Cada número de esta ruta está verificado ahí; nada se inventa.

---

## 1. Los 7 RDF, con su bloqueo y su cifra

| # | Gap | Pregunta | Cierra | Cifra de la sim #2 | Bloquea |
|---|---|---|---|---|---|
| 1 | G8 | ¿Redondeo por línea o por total? | ADR-014 | `75% × 1.572,15 = 1.179,1125` → por línea **1.179,12**, por total **1.179,11**. Dif **0,01** | T06, T05 |
| 2 | G2 | ¿Qué fecha dispara la retención? | G2-a/b/c/d | Abono 06-09-2025 × 1.500 asignado a `004-00099`; pago 10-09 posterior | T07 |
| 3 | G9 | ¿Serie ISLR mensual o anual? | G9 | Provisional `ISLR-AAAAMM-######`, sin formato aprobado | T05, F4 |
| 4 | G1 | ¿Período mensual o quincenal? | G1 | Período usado: 01-09-2025 → 01-10-2025 | T04 |
| 5 | ISLR | ¿Base con o sin IVA? | F2/F4 | 900,00 → 306,00 (`ISLR-09`) | T05, F4 |
| 6 | G4 | ¿Diferir o incluir? | ADR-013 | Ninguna factura en divisa en el mes de muestra | **Nada: se decide por escrito** |
| 7 | ADR-033 | ¿La NC resta en agregados? | ADR-033 | NC `001-00004` sumando en libro y apareciendo como elegible | T07 |

**Orden sugerido:** G8 primero (cierra ADR-014 y desbloquea T06, y es el que tiene la cifra exacta
en la mano), luego G2, luego ADR-033, luego G9/G1/ISLR, y G4 al final porque no es un RDF.

---

## 2. El recorrido en la UI, paso a paso

### Paso 1 — Borrador (quien prepara; admin/contador con permiso)

Ruta `/c/[empresaId]/decisiones/nueva`.

1. **Gap** (`tema fiscal`): `G8`, `G2`, `G9`, `G1`, `ISLR`, `G4`, `ADR-033`.
2. **Título** 5–140 caracteres. Ejemplo caso 1: `Redondeo por línea o por total en retención IVA 75 %`.
3. **Pregunta** ≥10 caracteres.
4. **Opción A** ≥10 caracteres + **impacto numérico** ≤500 caracteres. Ejemplo A: redondeo por
   línea HALF_UP a 2 decimales → impacto `1179.12`.
5. **Opción B** ≥10 caracteres + impacto. Ejemplo B: suma exacta y un redondeo del total →
   impacto `1179.11`.
6. **Cobertura**: qué regla autoriza esta decisión (`IVA`, `ISLR`, o ninguna para G4).

> Fuente de los 7 bloques de campos: `pendientes/CUARTA_REV/decisiones/pool-datos-decisiones.md`.

### Paso 2 — Completar borrador

Ruta `/c/[empresaId]/decisiones/[id]` → tarjeta **Flujo → Completar borrador**.

- **Decisión** ≥10 caracteres → `Guardar borrador` → `Enviar a revisión`.
- **Fundamento** ≥10 caracteres: norma + artículo + criterio del contador.
- **Ejemplo base** y **resultado esperado** con formato `0.00`.
- **Impacto en sistema**: qué ADR, qué regla, qué dorado se toca.

> Fuente: `pool-completar-borrador.md`. Correspondencia 1:1 con el Paso 1 (mismo orden, mismos casos).

### Paso 3 — Revisión y firma (solo contador)

1. `Enviar a revisión` → el contador **Aprueba** (o `Devuelve` con motivo).
2. **Firmar** con nombre + cédula/RIF.
3. Si quien firmó preparó el borrador **y** hay otro contador disponible, el motivo del
   auto-firmado es **obligatorio** (control de cuatro ojos, `docs/anexos/roles-piloto-form.md`).
4. **Vincular** la regla que autoriza: pestaña de vínculo, rol `autoriza`.

### Paso 4 — El efecto, que es lo que importa

Al **activar** la regla vinculada (`Reglas → detalle → Activar`):

- El motor evalúa primero los dorados: sin cobertura firmada → `GATE_NO_COVERAGE`.
- Con dorados verdes pero **sin RDF vinculado** → `GATE_NO_RDF`:
  *"Regla sin decisión firmada que la autorice: vincule un RDF firmado con el mismo impuesto/concepto."*
- Al activar, las decisiones vinculadas pasan `signed → applied` en la misma TX.

> Verificado en `src/modules/rules/service.ts:86` y `activation-gate.ts:57`. El orden
> dorados→RDF es deliberado: primero que el cálculo esté probado, luego que esté autorizado.

### Reglas inviolables durante el recorrido

| Regla | Por qué |
|---|---|
| Firmado = inmutable | El trigger `rdf_immutable` rechaza mutación en `signed/applied/superseded`; corregir = RDF nuevo con `supersedes_id` |
| El motor no se toca sin RDF | `AGENTS.md §2.3`; "nunca interpretar una conversación verbal como autorización" |
| Sintético no es activable en prod | `activation-gate.ts:133`: `synthetic: true` omite el gate |
| Cada RDF firmado lleva `content_sha256` | Firma verificable después; ACC-02 |

---

## 3. Qué se necesita antes de empezar

| Requisito | Estado 10-07 |
|---|---|
| Los 7 casos redactados | ✅ `pool-datos-decisiones.md` + `pool-completar-borrador.md` |
| Infra RDF + gate | ✅ ADR-034, migración 0023, 16/16 tests |
| Contador con rol y acceso a la empresa | 🟡 a confirmar (`docs/anexos/roles-piloto-form.md` sin matriz aprobada) |
| Recorrido probado de punta a punta | 🔴 nadie lo ejecutó con firmante (Q-09) |
| Base legal verificada | ✅ `docs/anexos/cotejo-gaceta-F0.md` (SNAT/2025/000054, Decreto 1.808, UT 43) |

**Recomendación:** ejecutar Q-09 primero (recorrido de prueba con un RDF descartable), porque
descubrir un fallo de la UI con el contador esperando es la forma más cara de perder la sesión.

---

## 4. G4 no es un RDF

G4 es la excepción de esta ruta, y la razón por la que `roadmapRev4 §14` sigue sin resolverse.
El RDF sirve para **elegir entre alternativas de cálculo**. G4 es **decidir si algo entra en v1**,
y eso no se firma en `/decisiones`: se escribe.

| Opción | Qué es | Costo |
|---|---|---|
| **A** | Diferir formalmente FX a v2; ADR-013 queda bloqueada para v2 | Cero código. Saca G4 de los bloqueos de go-live |
| **B** | Incluir en v1: tasa BCV con fecha y tipo, diferencias cambiarias, casos, dorados | 5–8 días + decisión fiscal + fixtures |

**Recomendación:** A. En el mes de muestra no hay facturas en divisa, y la Opción B exige material
de un contador (qué fecha de tasa, qué serie, cómo se reconoce la diferencia), no de una roadmap.

**Dónde se escribe:** una línea en `docs/TODO.md` (tabla de bloqueos activos) y otra en
`docs/DECISIONS.md` mencionando ADR-013 como diferida, con fecha y firmante. Media hora.

---

## 5. Después de firmar

```text
7 RDF firmados
   ↓
T04 matriz v1 (06-nov)      ← se carga por workflow, no editando el seeder (ADR-022)
   ↓                         Gate ACC-03 fail-closed: sin dorados no activa
T05 dorados 30 (10/semana desde 09-nov)
   ↓
T06 T07 T08 T09             ← T06/T07 ya tienen calibrador y script de divergencia
   ↓
T10 mes real + M5            ← gate: D1 abiertas = 0
   ↓
T11 UAT + cutover + go-live
```

Cada flecha tiene su bloque con aceptación en `../taskIN/CONSOLIDADO-TASK.md`. Ninguna se salta.