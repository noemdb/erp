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