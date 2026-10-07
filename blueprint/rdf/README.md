# RDF en sistema + asociación a regla — índice del spec

> **Estado:** implementado 2026-10-06 (ADR-034 aceptada; migración 0023 aplicada) · **Dueño:** equipo + contador
> **Origen:** sesión práctica 6 pasos OK (T03 operativo) → falta cerrar T03 en papel y trazar regla←RDF.
> **Regla de oro:** sin RDF firmado no hay código fiscal nuevo; sin ADR-034 aceptado no hay migración.

## Qué hay en esta carpeta

| Archivo | Responde |
|---|---|
| `01-spec-rdf.md` | Problema, objetivos/no-objetivos, usuarios, flujo, estados, reglas de negocio |
| `02-modelo-datos.md` | Tablas `fiscal_decisions` + `fiscal_decision_links`, constraints, RLS, migraciones, auditoría, `sha256` |
| `03-api-ux.md` | Server Actions, Zod, rutas `/decisiones`, RBAC, validaciones, errores, UI |
| `04-tests-rollout.md` | Aceptación, tests exigidos, gates, plan por fases, riesgos |

## Lectura rápida (30 segundos)

1. Hoy el RDF es un `.md` manual (`docs/anexos/RDF-plantilla.md`); no hay tabla, ni UI, ni vínculo con `withholding_rules`.
2. Este spec propone entidad `fiscal_decisions` inmutable tras firma + tabla puente `fiscal_decision_links` hacia `withholding_rules`.
3. Activar una regla no sintética exigirá ≥1 RDF firmado vinculado que cubra su `rule_kind`/`concept_id` (extiende el gate ACC-03 existente).
4. Todo pasa por `withTenant(ctx, fn)` + `authorize()` + RLS; DB solo en `modules/rdf/repo`; dinero string + `decimal.js`; `tax-engine` no se toca.
5. Implementación solo tras ADR-034 aceptado + matriz v1 firmada para valores reales.

Ver también: `docs/DOMAIN.md` (entidad planificada), `docs/DATABASE.md` (tablas planificadas, sin migrar), `docs/API.md` (acciones planificadas), `docs/DECISIONS.md` (ADR-034 propuesta), `docs/TODO.md` (bloque 🔲).
