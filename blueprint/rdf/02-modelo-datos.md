# 02 — Modelo de datos RDF (planificado, sin migrar hasta ADR-034)

> Drizzle + SQL explícito revisado a mano. `numeric` como string. Fechas fiscales `date`, instantes `timestamptz` UTC. Sin soft delete (estados, no borrado).

## 2.1 `fiscal_decisions`

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` | |
| `company_id` | uuid NOT NULL | FK `companies(id)` | Tenant; RLS por empresa |
| `codigo` | text NOT NULL | `RDF-YYYY-####` | Único por empresa (ver 2.4) |
| `gap` | text NOT NULL | CHECK IN (`G1`,`G2`,`G4`,`G8`,`G9`,`ISLR`,`OTRO`) | |
| `titulo` | text NOT NULL | 5–140 | |
| `pregunta` | text NOT NULL | ≥10 | |
| `alternativas` | jsonb NOT NULL | default `[]`, validado Zod | [{letra, descripcion, impacto_numerico?}] |
| `decision` | text NOT NULL | ≥10 (exigible desde `in_review`) | 1 frase clara |
| `fundamento_normativo` | text NULL | exigible desde `approved` | Norma+artículo o criterio contador motivado |
| `formula` | text NULL | | Usa vocabulario `DOMAIN.md` |
| `redondeo_metodo` | text NULL | CHECK IN (`HALF_UP`,`HALF_EVEN`,…) o NULL | G8 |
| `redondeo_etapa` | text NULL | CHECK IN (`por_linea`,`por_total`) o NULL | G8 |
| `redondeo_precision` | int NULL | 0–6 | G8 |
| `momento_fiscal` | text NULL | | Qué fecha manda |
| `ejemplo_numerico` | jsonb NOT NULL | default `{}` | Entradas congeladas |
| `resultado_esperado` | text NULL | string decimal 2 (`^\d+\.\d{2}$`) + `moneda` | Exigible desde `in_review` |
| `moneda` | text NOT NULL | default `VES` | G4 reservado: solo `VES` hasta ADR-013 |
| `rule_kind` | text NULL | CHECK IN (`iva`,`islr`) o NULL | Cobertura prevista |
| `concept_id` | uuid NULL | FK `withholding_concepts(id)` | Cobertura ISLR por concepto |
| `vigencia_desde` | date NULL | | Prevista para la regla |
| `impacto_sistema` | text NULL | | ADR/regla/dorado tocados |
| `status` | text NOT NULL | default `draft`, CHECK IN (`draft`,`in_review`,`approved`,`signed`,`applied`,`returned`,`rejected`,`superseded`) | Máquina §01-4 |
| `version` | int NOT NULL | default 1, CHECK ≥1 | Solo incrementa pre-firma |
| `supersedes_id` | uuid NULL | FK `fiscal_decisions(id)` | Corrección post-firma = nuevo RDF |
| `motivo` | text NULL | exigible en returned/rejected/supersede | |
| `firmante_nombre` | text NULL | exigible en `signed` | |
| `firmante_doc` | text NULL | exigible en `signed` | Cédula/RIF |
| `firmado_por` | uuid NULL | FK `users(id)` | Contador firmante |
| `firmado_en` | timestamptz NULL | | |
| `content_sha256` | text NULL | 64 hex, exigible en `signed` | Canónico JSON (ver 2.5) |
| `evidencia_adjunto_id` | uuid NULL | FK `attachments(id)` | PDF firmado opcional (módulo existente) |
| `created_by` | uuid NOT NULL | FK `users(id)` | |
| `created_at` | timestamptz NOT NULL | default `now()` | |
| `updated_at` | timestamptz NOT NULL | default `now()` | Trigger pre-firma solo |

**Índices:** `UNIQUE(company_id, codigo)`, `INDEX(company_id, status)`, `INDEX(company_id, gap)`, `INDEX(company_id, rule_kind, concept_id)`.

## 2.2 `fiscal_decision_links` (puente N:M)

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | uuid PK | |
| `company_id` | uuid NOT NULL, FK `companies` | Redundancia para RLS/partición lógica |
| `decision_id` | uuid NOT NULL, FK `fiscal_decisions(id)` | `ON DELETE RESTRICT` |
| `rule_id` | uuid NOT NULL, FK `withholding_rules(id)` | `ON DELETE RESTRICT` |
| `rol` | text NOT NULL, CHECK IN (`autoriza`,`aclara`,`deroga`) | |
| `nota` | text NULL | |
| `created_by` | uuid NOT NULL, FK `users` | |
| `created_at` | timestamptz NOT NULL default `now()` | |

**Índices:** `UNIQUE(decision_id, rule_id, rol)`, `INDEX(company_id, rule_id)`, `INDEX(company_id, decision_id)`.

## 2.3 Cambios aditivos en `withholding_rules` (misma migración)

- `source_decision_id uuid NULL → FK fiscal_decisions(id)`, `ON DELETE RESTRICT`.
- CHECK: si `status IN ('approved','active')` entonces `source_decision_id` inmutable (enforced en app + trigger; mensaje `DECISION_LOCKED`).
- Nota: reglas históricas sin RDF (seed 75 %, sintéticas) quedan con `source_decision_id NULL` y se marcan `synthetic=true`; no se backfillea autoría falsa.

## 2.4 Secuencia `rdf_series` (código sin huecos reutilizados)

Tabla `rdf_series(company_id, year, last_number)`; en la TX de creación:

```sql
INSERT INTO rdf_series(company_id, year, last_number) VALUES ($1,$2,1)
ON CONFLICT (company_id, year) DO UPDATE SET last_number = rdf_series.last_number + 1
RETURNING last_number;
-- codigo = 'RDF-' || year || '-' || lpad(last_number,4,'0')
```

Mismo patrón que `document_series` (ADR-005) pero serie propia. Rollback no consume (TX). Anulado/rechazado no libera número.

## 2.5 Canónico firmado (`content_sha256`)

`sha256` sobre JSON canónico: claves ordenadas, `alternativas` en orden de letra, números como string (`"1179.12"`, nunca `1179.12`), fechas ISO, sin `created_at/updated_at/firmado_en` (el hash cubre contenido fiscal, no metadatos de firma; `firmado_en` va auditado aparte). Re-firmar el mismo contenido da el mismo hash (reproducibilidad; test obligatorio).

## 2.6 RLS + auditoría + triggers

- RLS: `fiscal_decisions` y `fiscal_decision_links` con policy `company_id = current_setting('app.company_id')::uuid`; joins a `company_user` para lectura según membresía (igual que `withholdings`). `app_runtime` recibe DML sin `UPDATE/DELETE` en firmados (trigger `rdf_immutable` rechaza `UPDATE` en `signed/applied/superseded` salvo `signed→applied` por sistema; mensaje `RDF_IMMUTABLE`).
- `audit.record()` en la misma TX en cada transición y cada link create/delete, con `before/after` + `reason=motivo`.
- Storage del PDF firmado reutiliza `attachments` (magic bytes, dedup `sha256`, HMAC+TTL); la DB del RDF guarda solo `evidencia_adjunto_id`, nunca bytes.

## 2.7 Migración (plan, no aplicar aún)

`NNNN_rdf_decisions.sql` + `custom/` (RLS, triggers, `REVOKE`):
1. `CREATE TABLE fiscal_decisions (...)`, `fiscal_decision_links (...)`, `rdf_series (...)`.
2. `ALTER TABLE withholding_rules ADD COLUMN source_decision_id uuid REFERENCES fiscal_decisions(id)`.
3. Policies RLS + `GRANT` a `app_runtime` (DML salvo lo inmutable) + `REVOKE UPDATE,DELETE` espejo en firmados vía trigger (no basta con GRANT porque dev corre como owner: la defensa real pre-owner es app + tests).
4. Probar en Neon dev contra dump anonimizado; verificar `EXCLUDE` no aplica aquí (vigencias viven en reglas, no en RDF), pero sí `UNIQUE` concurrencia con 50 reservas paralelas de `codigo` (0 duplicados).
