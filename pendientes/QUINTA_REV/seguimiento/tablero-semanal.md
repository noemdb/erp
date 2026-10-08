# Tablero semanal — ERP-TributarioLite

Plantilla: `pendientes/CUARTA_REV/diff/index.md §B`. Primera edición: 2026-10-07.
Cada edición lleva fecha y responsable. Los desvíos numéricos que aparezcan siguen las reglas
D1–D5 de `docs/anexos/bitacora-diferencias.md`.

---

## Edición 2026-10-07 — primera

**Estado de la semana:** el sistema funciona (simulación #2 completa sobre el sistema real) y la
infra de decisión fiscal existe (ADR-034). Lo que falta es firma. Ninguna tarea del camino crítico
avanzó porque todas esperan al contador.

| Métrica | Fórmula | Valor | Meta | Estado | Nota |
|---|---|---|---|---|---|
| RDF firmados | firmados / 7 | **0/7** | 7/7 | 🔴 | 7 redactados, ninguno firmado |
| Dorados firmados | firmados / 30 | **0/30** | 30/30 | 🔴 | 1 fixture sin firmar; umbral en `_manifest` |
| Cobertura de reglas | reglas con RDF / reglas matriz | 0/9 | 9/9 | 🔴 | 9 reglas transcritas en el borrador |
| Muestras reales | M-1…M-4 / 4 | **0/4** | 4/4 | 🔴 | límite 16-oct |
| Tests | verdes / total | 77/78 | 78/78 | 🟡 | el rojo es credencial `app_runtime` local (T13) |
| Tablas doc↔schema alineadas | tablas / tablas | 3/9 | 9/9 | 🔴 | Q-03: 3 tablas con columnas inexistentes |
| Bloqueos P0/P1 abiertos | abiertos | 5 | 0 | 🔴 | G8, G2, ADR-033, FX/G4, series ISLR |
| Tareas sin dependencia externa abiertas | abiertas | 13 | 0 | 🔴 | **ninguna depende del contador** |
| Spillover a la semana | tareas movidas | — | explícito | — | primera edición, sin base de comparación |

### Bloqueos P0/P1 abiertos

| # | Bloqueo | Tipo | Quién |
|---|---|---|---|
| 1 | G8 redondeo sin firma → `round2` provisional y dos tolerancias conviviendo | P0 | contador |
| 2 | G2 sin firma → IVA no consume eventos; criterio `unset` | P0 | contador |
| 3 | ADR-033 sin firma → NC suma en agregados y es elegible para retención | P0 | contador |
| 4 | G4 ambiguo → bloqueo sin tarea que lo resuelva | P1 | contador/cliente |
| 5 | Serie ISLR sin formato aprobado | P1 | contador |

### Lectura de la semana

1. **El balance es favorable y la conclusión es incómoda:** la cuarta revisión construyó infra
   (RDF en sistema) sin cerrar firmas. El camino crítico tiene un solo tramo sin dependencias
   externas y está vacío.
2. **13 tareas no dependen del contador** y ninguna está empezada. Es la palanca disponible.
3. **Riesgo latente detectado:** `purchase_document_lines.tax_rate` guarda fracción en import y
   porciento en manual, mientras el motor lo trata como fracción (Q-05). No explota hoy porque el
   motor solo corre sobre dorados; explota con el primer consumidor real.
4. **Fecha:** meta de matriz v1 = 06-nov. Con 0/7 RDF a 10-07, depende de que la sesión del 23-oct
   firme de verdad.

### Acciones de la semana siguiente

- [ ] Q-01, Q-02, Q-03 (T14 + DATABASE.md) — 🔴 P1, sin dependencias
- [ ] Q-05 (alícuota una escala) — bug latente
- [ ] Q-08 (este tablero, edición siguiente)
- [ ] T02: reclamar M-1…M-4 antes del 16-oct
- [ ] B1: agendar la firma de los 7 RDF
- [ ] B2: llevar `../decisiones/decision-G4-alcance.md` a una decisión de una frase

---

## Edición 2026-10-08 — segunda (Fase 0 en curso)

**Estado de la semana:** Q-01…Q-05 + Q-07 + Q-10 cerrados; `docs:verify-schema` 7/7 sin P1;
`RATE_SCALE_INVALID` implementado con test 4/4. Lo que falta es firma y entorno
(Q-09 sin DB aquí, T12/T13 sin servidor).

| Métrica | Fórmula | Valor | Meta | Estado | Nota |
|---|---|---|---|---|---|
| RDF firmados | firmados / 7 | **0/7** | 7/7 | 🔴 | redactados, ninguno firmado (B1) |
| Dorados firmados | firmados / 30 | **0/30** | 30/30 | 🔴 | semilla Q-07 completa (17), 0 firmados |
| Cobertura de reglas | reglas con RDF / reglas matriz | 0/9 | 9/9 | 🔴 | 9 reglas transcritas en el borrador |
| Muestras reales | M-1…M-4 / 4 | **0/4** | 4/4 | 🔴 | límite 16-oct (8 días) |
| Tests | verdes / total | 77/78* | 78/78 | 🟡 | *último medido 10-07; aquí puras 24/24 + rate-scale 4/4; DB no ejecutable (Neon ECONNRESET preexistente) |
| Tablas doc↔schema | alineadas / total | 7/7 | 7/7 | 🟢 | `docs:verify-schema` 0 P1 (era 3/9); P3 islr resuelto con tabla propia |
| Bloqueos P0/P1 | abiertos | 5 | 0 | 🔴 | G8, G2, ADR-033, G4, serie ISLR (todos fiscales, del contador) |
| Tareas sin dependencia externa | abiertas | 4 | 0 | 🟡 | Q-08 (esta), Q-09⏳ entorno, T12/T13 servidor; Q-01…Q-07 y Q-10 cerradas |
| Spillover | tareas movidas | Q-09, T12, T13 | explícito | — | pasan a entorno con DB/servidor |

### Lectura de la semana

1. **La mentira documental se cerró:** A1✅ (spec=código, verificado por script repetible) y A2✅ (una escala con test). Gate roadmapRev5 §9: A1✅ A2✅ A3❌ A4 parcial B1❌ B2❌ B3❌.
2. **El tramo sin dependencias está casi vacío:** solo Q-09 (ensayo, necesita DB) y T12/T13 (servidor).
3. **Riesgo fecha:** T02 vence 16-oct; matriz v1 06-nov exige sesión ≤23-oct. Palanca: Fase 1 (7 RDF en borrador + frase G4) para 1 sola sesión.

### Acciones de la semana siguiente

- [ ] Q-09 dry-run donde haya DB (antes de la sesión)
- [ ] T12/T13 donde haya servidor
- [ ] Fase 1: 7 RDF en borrador + frase G4 + acuse T01 + reclamo T02
- [ ] Q-06 ya cerrada; Q-08 (esta edición) ✅

---

## Plantilla para la próxima edición

```markdown
## Edición ____-__-__ — semana N

| Métrica | Fórmula | Valor | Meta | Estado | Nota |
|---|---|---|---|---|---|
| RDF firmados | firmados / 7 | /7 | 7/7 | | |
| Dorados firmados | firmados / 30 | /30 | 30/30 | | |
| Cobertura de reglas | reglas con RDF / total | / | ≥80% | | |
| Muestras reales | M-1…M-4 / 4 | /4 | 4/4 | | |
| Tests | verdes / total | / | 100% | | |
| Tablas doc↔schema | alineadas / total | / | 100% | | |
| Bloqueos P0/P1 | abiertos | | 0 | | |
| Tareas sin dependencia externa | abiertas | | 0 | | |
| Spillover | movidas desde la semana previa | | explícito | | |

**Desvíos con diferencia numérica** (regla D1–D5 de `docs/anexos/bitacora-diferencias.md`):
| Hoja/celda | Esperado | Obtenido | Clase | Causa | Estado |
|---|---|---|---|---|---|

**Notas:** ______
**Próxima revisión:** ____
```