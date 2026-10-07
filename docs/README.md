# docs/ — ERP-TributarioLite

> **Estado:** v0.1 propuesta · Actualizado: 2026-10-01 · F1–F7 tienen implementación parcial/mayoritaria según `TODO.md`; reglas fiscales y salida a producción siguen bloqueadas por validación F0.
> Dueño: equipo + contador. Fuente operativa: `docs/`; `blueprint/` y el cuestionario son material de referencia histórica/levantamiento, no aprobación de reglas.

## Mapa

| Archivo | Responde | Leer cuando |
|---|---|---|
| `PROJECT.md` | ¿Qué y para quién? | Siempre primero |
| `ARCHITECTURE.md` | ¿Cómo se conectan piezas? | Decisiones stack/flujos |
| `DOMAIN.md` | Idioma ubicuo, invariantes, estados | Tocas motor/cálculos |
| `DATABASE.md` | Tablas, constraints, RLS, Zod | Tocas schema |
| `API.md` | Server Actions + Handlers | Tocas emisión/import/cierre |
| `SECURITY.md` | RBAC, RLS, secretos, límites | Tocas auth/datos sensibles |
| `CONVENTIONS.md` | Estilo, estructura, tests | Escribes código |
| `DECISIONS.md` | ADR-001–034 (incluye propuestas abiertas 018–020, 033–034 y controles G2/PDF/storage) | Dudas entre alternativas |
| `TODO.md` | Estado F0–F7 y bloqueos | Planificas/retomas |
| `CHANGELOG.md` | Qué cambió por fecha | Auditoría docs |
| `anexos/` | Matriz, dorados, checklist F0 y hoja de decisión G2 | Sesión con contador |

## Lectura por rol

- Dev nuevo/IA: `PROJECT + ARCHITECTURE + TODO` mínimo; +`DOMAIN` si motor, +`DATABASE` si schema, +`API/SECURITY` si endpoint sensible.
- Contador: `PROJECT + DOMAIN (glosario/7 fechas) + anexos/matriz-reglas-v1 + anexos/checklist-F0`.
- Auditor: `SECURITY + TODO + DECISIONS`.

## Diagramas

Mermaid en `ARCHITECTURE.md` (componentes/flujo) y `DATABASE.md` (ERD). Exportados para no técnicos en `assets/` (PNG + `trazabilidad.md`). Plantilla XLSX recibida; su validación como golden master sigue pendiente (ver `TODO.md`).

## Proceso

1. Al iniciar sesión IA: pasa contexto mínimo arriba.
2. Al cerrar: actualiza `TODO.md` + `CHANGELOG.md`, crea ADR si cambió rumbo.
3. Nunca marques ✅ sin checklist `TODO.md`. Bloqueantes G4/G8/G9 no se resuelven en código.
