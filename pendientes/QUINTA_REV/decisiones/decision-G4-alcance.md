# Decisión G4 — ¿difiero o incluyo FX en v1?

> **Qué decide:** si las operaciones en moneda extranjera (divisas) entran en el alcance de v1.
> **Quién:** contador + cliente.
> **Por qué es una decisión y no un RDF:** no hay dos métodos de cálculo que elegir; hay dos
> alcances. Se escribe en `docs/TODO.md` y `docs/DECISIONS.md`, no se firma en `/decisiones`.
> **Origen:** `pendientes/CUARTA_REV/roadmapRev4.md §14`, que pidió exactamente esto hace dos
> revisiones y sigue abierto. **Estado:** abierto desde 2026-10-01.

---

## 1. El problema, en una frase

`roadmapRev4 §14` lo dijo sin rodeos: **"No dejar G4 en un estado ambiguo."**

El problema es que G4 está en dos sitios a la vez:

| Dónde | Qué dice |
|---|---|
| `docs/TODO.md` "Bloqueos activos" | G4 (FX) bloquea F2, desde 2026-10-01 |
| `roadmapRev4` camino crítico | T01→T03→T04→T05→…→T10→T11: **G4 no aparece en ninguna tarea** |

Consecuencia: hay un bloqueo que no se resuelve en ninguna tarea, y por tanto no se resuelve
nunca. Peor que bloqueado: no se sabe si es trabajo pendiente o si es ruido.

---

## 2. Qué se sabe ya (todo verificado o documentado)

| Dato | Fuente | Estado |
|---|---|---|
| Moneda base: bolívares | Cliente, 2026-10-01 | Informado |
| USD como moneda de referencia | Cliente, 2026-10-01 | Informado |
| Tipo de cambio oficial BCV | Cliente, 2026-10-01 | Informado |
| Fecha de la tasa | — | **No definida** |
| Tipo/serie de la tasa | — | **No definido** |
| Tratamiento de diferencias cambiarias | — | **No definido** |
| `fx_rate`, `fx_rate_date` en `purchase_documents` | `docs/DATABASE.md` | **Documentadas, NO existen en el físico** (verificado 10-07, Q-03) |
| `currency` en documentos y eventos | Schema físico | Existe, siempre `VES` en la práctica |
| `currency_functional` en `companies` | `docs/API.md` | Existe, `default VES`, con nota "G4 reservado" |
| Facturas en divisa en el mes de muestra | `retrospectiva-sim2.md` | **Ninguna**: lote `9740a7bd`, 10 documentos, todos VES |

---

## 3. Opción A — Diferir formalmente (recomendada)

**Decisión:** en v1, toda operación se registra y se calcula en bolívares. Las facturas en divisa
quedan fuera del alcance hasta que exista la definición de tasa.

Qué implica:

- Sacar G4 de la tabla de bloqueos activos de `docs/TODO.md` y reemplazarlo por una línea que diga
  "diferido formalmente en v1, se retoma en v2".
- Dejar ADR-013 bloqueada, con nota de que el diferimiento no la resuelve.
- Documentar en `docs/PROJECT.md` (alcance de v1) y `docs/DOMAIN.md` que la moneda es VES.
- **Cero código.** `currency` queda con valor único; `fx_rate` sigue sin existir y la
  documentación deja de prometerlo (Q-03).

**Lo que se pierde:** si algún cliente tiene facturas en USD, no se pueden registrar. Hoy, según
la muestra, ninguno.

---

## 4. Opción B — Incluir en v1

**Decisión:** v1 registra operaciones en divisa, convierte a VES y reconoce diferencias.

Requiere, en orden:

| # | Qué | Quién | Esfuerzo |
|---|---|---|---|
| 1 | Decidir fecha y tipo/serie de la tasa BCV aplicable | contador | sesión |
| 2 | Definir tratamiento contable de diferencias cambiarias | contador | sesión |
| 3 | Migración aditiva: `fx_rate`, `fx_rate_date`, moneda en documentos y eventos | equipo | 0,5–1 d |
| 4 | Motor: conversión antes de IVA y antes de retención, con redondeo coherente con G8 | equipo | 1–2 d |
| 5 | Reglas y RDF para la conversión | contador | sesión |
| 6 | Dorados de conversión y diferencias (mínimo 5) | equipo + contador | 1 d |
| 7 | UAT con factura real en divisa | cliente | sesión |
| 8 | Cierre de período con posiciones en divisa | equipo | 0,5 d |

**Total:** 3–5 días de equipo + 3 sesiones de contador, más fixtures y un caso UAT real.

---

## 5. Comparación

| Criterio | Opción A (diferir) | Opción B (incluir) |
|---|---|---|
| Días de equipo | 0 | 3–5 |
| Sesiones de contador | 1 (esta decisión) | 3+ |
| Riesgo de error fiscal | Ninguno nuevo | Alto: la tasa y las diferencias son fuente clásica de error |
| Bloquea el calendario de nov | No | Sí |
| Reversibilidad | Trivial (se abre en v2) | Media |
| Necesidad demostrada | — | **Ninguna en la muestra** |

---

## 6. Recomendación

**Opción A.** Tres razones, en orden de peso:

1. **No hay caso.** El mes de muestra (10 documentos, lote `9740a7bd`) no tiene una sola factura
   en divisa. Construir FX para un caso que no existe es gasto, no prudencia.
2. **El costo no es de programación, es fiscal.** La fecha y el tipo de tasa BCV, y el
   reconocimiento de diferencias cambiarias, son decisiones de contador. Meterlas "para dejar el
   tema cerrado" pone reglas fiscales sin firma en el camino crítico — justo lo que
   `roadmapRev4 §3.1` prohíbe.
3. **Diferir por escrito es una decisión; dejarlo ambiguo no lo es.** El §14 lo pidió
   precisamente porque ambas cosas son inaceptables y solo una es fácil.

---

## 7. Cómo se cierra

Una frase del contador o del cliente, puesta en dos sitios:

**`docs/TODO.md`, tabla "Bloqueos activos":**

```diff
- | F2 FX | Moneda base bolívares, referencia USD y fuente oficial BCV indicadas; fecha/tipo de tasa y diferencias cambiarias sin definir | 2026-10-01 | Definir fecha y tipo de tasa BCV, diferencias y ejemplos; después resolver ADR-013 |
+ | ~~F2 FX~~ | **Diferido formalmente en v1** el 2026-10-__ por ___. v1 opera en VES; FX se abre en v2 con ADR-013. Sin facturas en divisa en el mes de muestra. | 2026-10-01 → cerrado | Revisar en v2 |
```

**`docs/DECISIONS.md`:** una nota bajo ADR-013 indicando que sigue bloqueada por diferimiento, con
la misma fecha y firmante.

**Estado formal:** APROBADO / MODIFICAR / PENDIENTE, con fecha y firmante.

---

## 8. Si la respuesta es B

Entonces G4 entra en el camino crítico como cualquier otra regla fiscal y necesita:

1. Su bloque en `../taskIN/CONSOLIDADO-TASK.md` (Q-13), ⛔ tras la definición de tasa.
2. Su RDF, con la cifra real de un caso en divisa.
3. Sus dorados y su UAT.
4. Su entrada en `roadmapRev5 §6` (Fase C).

Ninguna de las cuatro existe hoy. Por eso A es la recomendación: no porque B sea mala idea,
sino porque B es un proyecto, y hoy no hay nadie que lo haya decidido empezar.