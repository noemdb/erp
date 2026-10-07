# QUINTA_REV — ERP-TributarioLite

> **Estado:** revisión de coherencia y cierre. Predecesora: `pendientes/CUARTA_REV/` (05-oct).
> **Fecha:** 2026-10-07
> **Dueño:** equipo; el contador o el cliente donde la decisión sea fiscal.
> **Fuente de verdad:** sigue siendo `docs/`. Esto es una fotografía de trabajo con verificación
> en el repo, no un documento normativo.

## Qué es esta revisión y qué no

**Es:** el estado real verificado del sistema al 10-07, las 13 tareas que no dependen del contador,
la ruta para pasar 7 RDF redactados a 7 firmados, y los parches documentales listos para aplicar.

**No es:** una propuesta de features, una nueva lista de wishes, ni un reemplazo de
`roadmapRev4.md`. Lo que la cuarta revisión dijo y no se hizo queda anotado en
`consolidado-docs-2026-10-07.md §4`.

## Mapa

| Archivo | Responde | Leer cuando |
|---|---|---|
| `consolidado-docs-2026-10-07.md` | ¿Dónde estamos realmente? | Primero, siempre |
| `roadmapRev5.md` | ¿Qué se hace ahora y en qué orden? | Planificar la semana |
| `taskIN/CONSOLIDADO-TASK.md` | ¿Qué bloque concreto sigue? | Ejecutar |
| `diff/index.md` | ¿Qué líneas exactas de docs corregir? | Aplicar T14 / Q-03 |
| `decisiones/ruta-firma-rdf.md` | ¿Cómo se firma un RDF paso a paso? | Sesión con el contador |
| `decisiones/decision-G4-alcance.md` | ¿FX entra en v1? | Decisión de una frase |
| `seguimiento/tablero-semanal.md` | ¿Cómo va el desvío? | Cada semana |

## Los tres mensajes

**1. El camino crítico tiene un solo tramo sin dependencias externas, y está vacío.**
14 de 15 tareas de la cuarta revisión dependían del contador. En esta, 13 de 20 no dependen de
nadie: T14, la corrección de `DATABASE.md`, la escala de alícuota, la higiene de referencias, la
semilla de dorados, el tablero, T12 y T13. Si el contador no responde, el equipo sigue
entregando.

**2. La simulación funcionó y el RDF está implementado; lo que falta es el acto.**
El 06-oct la simulación de 6 pasos correr sobre el sistema real y dejó la cifra G8 exacta
(`1.179,12` vs `1.179,11`). Ese mismo día se implementó el RDF en sistema (ADR-034): entidad
inmutable, vínculo a regla, gate `GATE_NO_RDF`. Los 7 casos están redactados. **Ninguno está
firmado.** La infra está lista; el camino para firmar también (`decisiones/ruta-firma-rdf.md`),
pero nadie lo ejecutó de punta a punta (Q-09).

**3. La especificación miente sobre el código en 3 tablas.**
Verificación automática contra el snapshot Drizzle: `purchase_documents`, `payments` y
`attachments` documentan columnas que no existen, con nombres que además difieren. Quien lea
`docs/` antes de tocar el código toma decisiones equivocadas. Es el defecto más barato de
arreglar (Q-03) y el más caro de ignorar. Los parches exactos están en `diff/index.md §B`.

## Verificación usada

| Qué | Cómo | Resultado |
|---|---|---|
| Gate de go-live | `npm run acceptance:gate --profile=golive` | NO-GO: 0/30 dorados, matriz sin firmar, sin M2/M5, sin acta, sin restore drill |
| Tests | conteo en `src/` | 52 archivos en 18 módulos; snapshot 77/78 (el rojo es credencial local) |
| Migraciones | journal + snapshot | 0000–0023, 0023 = RDF |
| `DATABASE.md` vs schema | comparación tabla por tabla contra `0021_snapshot.json` | 3 tablas con columnas documentadas inexistentes; 4 con columnas sin documentar |
| Escala de alícuota | lectura de `confirm.ts`, `purchase-form.tsx`, `compute.ts` | fracción en import, porciento en manual, motor asume fracción |
| E-3 (`origin`) | grep en schema y seeds | no existe; el seeder usa `--matrix-hash` + `synthetic` |

## Relación con las revisiones anteriores

| Revisión | Qué aportó | Qué quedó abierto |
|---|---|---|
| PRIMERA_REV | 17 escenarios candidatos, asesoría F0 | Ninguno firmado; `ISLR-09` con base corregida sin verificar |
| SEGUNDA_REV | Dorados normalizados (IVA/ISLR/ABONO) | Sin protocol de firma a ciegas |
| TERCERA_REV | Enmienda E-2 (fracción + `base_gravable`), SPEC de RDF | 0 firmados; E-3 (`origin`) sin responder |
| CUARTA_REV | Roadmap a go-live, sesión práctica, pools de RDF, parches T14 | 0 RDF firmados; parches no aplicados; G4 ambiguo; `diff` truncado |
| **QUINTA_REV** | Estado verificado, 13 tareas sin dependencia, ruta de firma, decisión G4, parches listos | **La firma sigue siendo del contador** |