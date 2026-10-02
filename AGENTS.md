# AGENTS.md — ERP-TributarioLite

> Derivado de `blueprint/GUIA.md` v2. Para Cursor, Claude Code, Codex, OpenCode. La IA no improvisa: ejecuta este archivo + `docs/`.

## 1. Contexto obligatorio

Mínimo siempre: `docs/PROJECT.md` + `docs/ARCHITECTURE.md` + `docs/TODO.md`.
Sumar según tarea:
- motor/cálculos → `docs/DOMAIN.md`
- schema → `docs/DATABASE.md`
- endpoint/emisión/import/cierre → `docs/API.md`
- auth/datos sensibles → `docs/SECURITY.md`
- estilo/estructura → `docs/CONVENTIONS.md`
- alternativa real → `docs/DECISIONS.md` (ADR-001–014)
- F0 fiscal → `docs/anexos/checklist-F0.md`, `docs/anexos/matriz-reglas-v1.md`
- estado/cambios → `docs/CHANGELOG.md`, `docs/README.md`

Regla de oro: **si no está en `docs/`, no existe**. Si te re-explican algo de hace 2 semanas, escríbelo donde debía estar, no lo repitas en chat.

## 2. Reglas de hierro (no negociar)

1. Idioma ubicuo `DOMAIN.md`: sin sinónimos (`base_imponible` no `subtotal`, `comprobante` no `certificado`).
2. Todo acceso DB por `withTenant(ctx, fn)` + `authorize()` + RLS. DB solo en `modules/*/repo`. Dinero string + `decimal.js`, `numeric(18,2)/(18,6)`, jamás `float`.
3. `tax-engine` puro: sin DB/red/reloj, `(company, counterparty, doc, asOf, rules)` → `{amounts, ruleVersionId, ruleSnapshot, explanation[]}`.
4. Inmutable: emitido/cerrado no se edita (anula/sustituye/`replaces_id`/ajuste). Numeración `UPDATE series RETURNING` en TX, nunca `MAX()+1`.
5. Import por staging `source_files→batches→rows`, idempotencia `sha256`+clave natural, diferencia retención marcada no sobrescrita.
6. Stack: Next.js 16 App Router + PG ≥16 + **Drizzle** (no Prisma), Server Actions + Handlers solo upload/download/health, Zod en servidor.
7. Bloqueados G4/FX (ADR-013), G8/redondeo (ADR-014), G9/ISLR: documentar, no codificar solución definitiva.

## 3. Cómo trabajar

- Por bloques pequeños (una función/endpoint/acción). Nunca “la app completa”.
- Antes de codificar: bloque en `TODO.md` con aceptación. Si expone/consume API: documenta en `API.md` en el momento.
- Al terminar bloque: checklist `TODO.md` (funciona, errores, tests, dominio, API, SECURITY). Sin ✅ a medias.
- Seguridad desde el inicio: env, validación, rate limit, RBAC rol×empresa, sin PII en logs, upload por contenido + URL firmada.
- Auditoría: `audit.record()` en misma TX. Cambio de rumbo → ADR nuevo (no editar pasado). Estilo → `CONVENTIONS.md`.
- Cierre sesión: actualiza `TODO.md` (estado real) + `CHANGELOG.md`, propone ADR si aplica.

## 4. Comandos y verificación

- `TODO.md` F0–F7 define gates: sin matriz v1 + dorados no se cierra F2; sin mes real = Excel no se cierra F3.
- Tests exigidos: Vitest dorados 100%, fast-check Inv.1–3, PostgreSQL real en Neon dev para EXCLUDE/RLS/triggers (sin Docker ni Testcontainers), fuga tenants CI, concurrencia 50–100 (0 huecos), Excel vs golden, Playwright E2E, reproducibilidad `sha256`.
- Solo documentación por ahora salvo orden explícita de implementar (ver `TODO.md`).

## 5. Mapa rápido

`docs/PROJECT|ARCHITECTURE|DOMAIN|DATABASE|API|SECURITY|CONVENTIONS|DECISIONS|TODO|CHANGELOG|README` + `anexos/` + `assets/trazabilidad.md`. Blueprint (`cuestionario, Perplexity, fuentes, ROADMAP, GUIA`) es fuente histórica, no autoridad operativa.
