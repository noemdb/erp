# Parches documentales — QUINTA_REV

> Heredado de `pendientes/CUARTA_REV/diff/index.md` (§A se conserva y se completa; §B se aplica;
> §C se referencia; §D se reemplaza por Q-07). Aplicar con `AGENTS.md §3`: bloque pequeño,
> checklist, sin tocar código.
> Cada parche dice **qué truth verify** para no aplicarlo a ciegas.

---

## A. T14 — Alineación docs-código (Q-01, Q-02)

### A.1 `docs/ARCHITECTURE.md` — auth (🔴 P1, contradice ADR-030)

```diff
- | Auth | Auth.js o Better Auth, sesiones en DB *(elegir en F1)* | Sesiones revocables; autorización `rol × empresa` propia (ADR-010) |
+ | Auth | Sesiones DB propias (ADR-030): Argon2id, recuperación asistida, revocables | Sin dependencia externa; autorización `rol × empresa` propia (ADR-010) |
```

**Verificar antes de aplicar:** ADR-030 aceptada e implementada (`identity/recovery.ts`,
tabla `sessions`). Sí, verificado 10-07.

### A.2 `docs/ARCHITECTURE.md` — mermaid de componentes (🔴 P1, contradice ADR-031)

```diff
  subgraph Worker["Worker (misma imagen)"]
-    Q[pg-boss jobs]
-    PDF[Render PDF/Excel]
-    PARSE[Parse/validación CSV grande]
+    Q[Ejecutor render:retry por planificador]
+    PDF[Render PDF/Excel]
+    PARSE[Parse/validación CSV grande]
  end
```

### A.3 `docs/ARCHITECTURE.md` — mermaid de despliegue (🔴 P1)

```diff
  Proxy (Caddy/Nginx, TLS) → app (Next.js) ┐
-                           worker (pg-boss, PDF) ├→ PostgreSQL
+                           ejecutor (render:retry, PDF) ├→ PostgreSQL
                                                   └→ Storage privado
```

### A.4 `docs/ARCHITECTURE.md` — tabla de stack, fila PDF (🟡 P2)

```diff
- | PDF | HTML/CSS → PDF server-side (Chromium headless en el worker) | ... |
+ | PDF | HTML/CSS → PDF server-side (Chromium headless 154, ejecutado por `render:retry` fuera de la TX, ADR-027/ADR-031) | ... |
```

### A.5 `docs/API.md` — export Excel (🔴 P1)

```diff
- - Export Excel vía `exceljs` sobre plantilla original (neutralizar CSV injection `=+-@`), PDF vía HTML→Chromium en worker. Almacena con `sha256`.
+ - Export Excel vía `exceljs` sobre plantilla original (neutralizar CSV injection `=+-@`), PDF vía HTML→Chromium ejecutado por `render:retry` con gatillos (>5000 filas / >10s / >5 pendientes). Cola `pg-boss` diferida por ADR-031. Almacena con `sha256`.
```

**Ya correctos, no tocar:** `ARCHITECTURE.md:157` y `API.md:116` (ya dicen `render:retry`,
ADR-031). El doc está corregido a medias: por eso Q-01/Q-02 cuentan como P1 y no como P3.

---

## B. DATABASE.md vs schema físico (Q-03) — 🔴 P1

Fuente de verdad para contrastar: `drizzle/migrations/meta/0021_snapshot.json`.

### B.1 `purchase_documents` (líneas ~298-375)

```diff
- | voided_at | timestamptz | NULL | |
- | void_reason | text | NULL | |
- | replaces_id | uuid | FK purchase_documents NULL | |
+ | *(no existen en el físico)* | | | La anulación usa `status='voided'`. Las columnas `voided_at`/`void_reason`/`replaces_id` son parte de ADR-033 (propuesta, sin firma): no migrar sin decisión del contador |
```

Además, documentadas y ausentes en la misma tabla: `branch_id`, `fx_rate`, `fx_rate_date`,
`attachments_count`. Y `created_at`/`updated_at` no figuran en la tabla del doc.

**Nota `affected_document_id`:** sí existe en el físico y sí está documentado. No confundir con
`replaces_id`, que no existe.

### B.2 `payments` (eventos de liquidación, línea ~449-470)

```diff
- | voided_at | timestamptz | NULL | |
- | void_reason | text | NULL | |
+ | *(no existen en el físico)* | | | Misma situación que B.1: `status` `active|voided` es lo único verificado |
```

### B.3 `attachments` (línea ~736-752)

```diff
- | mime_type | text | NOT NULL | |
+ | mime | text | NOT NULL | |
- | storage_path | text | NOT NULL | Clave del driver (`fs:<sha>` o clave UploadThing) |
+ | storage_key | text | NOT NULL | Clave del driver (`fs:<sha>` o clave UploadThing) |
- | uploaded_by | uuid | FK users | |
- | uploaded_at | timestamptz | NOT NULL DEFAULT now() | |
+ | created_by | uuid | FK users | |
+ | created_at | timestamptz | NOT NULL DEFAULT now() | |
- | + `sha256` UNIQUE por empresa (dedup), `status` active/voided + `void_reason` (no se borra) | | |
+ | sha256 | text | UNIQUE por empresa (dedup) | |
+ | status | text | active/voided | |
+ | void_reason | text | NULL | (no se borra) |
```

### B.4 Columnas del físico sin documentar (🟡 P3)

| Tabla | Añadir |
|---|---|
| `companies` | `color_dististivo`, `logo_url`, `email_contacto`, `telefono`, `nombre_comercial`, `sales_mode`, `created_at`, `updated_at` (migración 0020) |
| `withholding_rules` | `synthetic` (bool), `approved_by`, `approved_at`, `change_reason` |
| `iva_withholdings` | `render_status` (ADR-027: `pending` → render post-commit) |
| `islr_withholdings` | igual: `render_status` |

### B.5 Secciones ausentes (🟡 P3)

`sessions`, `password_reset_tokens`, `fiscal_obligations`, `fiscal_holidays`,
`withholdings_received`, `received_links`, `islr_withholding_lines` viven en listas de prosa.
`islr_withholdings` está como "análogo" sin tabla propia.

**Prioridad:** B.1 y B.2 son P1 (invitan a programar contra algo inexistente). B.3 es P1 (los
nombres no coinciden y rompen cualquier lectura del repo). B.4/B.5 son P3 (deuda de completitud).

---

## C. Referencias rotas (Q-06)

| Archivo:línea | Dice | Debería decir |
|---|---|---|
| `CUARTA_REV/consolidado-docs-2026-10-05.md:198` | `TERCERA_REV/task/T01–T15` + índice (copiadas a `CUARTA_REV/taskIN/`) | `../../CUARTA_REV/taskIN/CONSOLIDADO-TASK.md` (consolidado en un archivo) |
| `CUARTA_REV/consolidado-docs-2026-10-05.md:225` | `CUARTA_REV/taskIN/T01–T15` + `00-INDICE.md` | `../../CUARTA_REV/taskIN/CONSOLIDADO-TASK.md` |
| `CUARTA_REV/consolidado-docs-2026-10-05.md` §8 | "ADR-001–032" | ADR-001–034 (033 propuesta, 034 aceptada e implementada) |
| `roadmapRev4.md §20` | pide `docs/rdf/RDF-G*.md` | obsoleto: el RDF vive en DB (ADR-034, migración 0023). La plantilla markdown sigue en `docs/anexos/RDF-plantilla.md` |
| `roadmapRev4.md §20` | pide `docs/operacion/`, `docs/tablero-semanal.md`, `docs/goldens/` | no existen; `go-live-checklist.md` y `docs/anexos/bitacora-diferencias.md` cubren parte |

---

## D. Semilla de dorados — mover a Q-07

`CUARTA_REV/diff/index.md §D` está truncado en la fila `12-17`. Completar en
`../taskIN/CONSOLIDADO-TASK.md` (Q-07) o reemitir aquí completa. Semilla conocida: 17 candidatos de
`pendientes/PRIMERA_REV/dorados-propuestos-F0.json` + ISLR-07 + ABONO-01…03
(`pendientes/SEGUNDA_REV/dorados-normalizados/`). `ISLR-09` corregido (base 900 → 306,00) sin
verificar con el contador → marcar `⛔`.

---

## E. Tablero semanal (Q-08) — plantilla de `CUARTA_REV/diff/index.md §B`

```markdown
# Tablero semanal — ERP-TributarioLite

Semana del ____ · Próxima edición: ____ · Responsable: ____

| Métrica | Fórmula | 10-07 | Meta | Estado |
|---------|---------|-------|------|--------|
| RDF firmados | firmados / 7 | 0/7 | 7/7 | 🔴 |
| Dorados firmados | firmados / 30 | 0/30 | 30/30 | 🔴 |
| Cobertura de reglas | reglas con RDF / reglas | 0/9 | 9/9 | 🔴 |
| Tests | verdes / total | 77/78 | 78/78 | 🟡 |
| Tablas doc↔schema alineadas | tablas / tablas | 3/9 | 9/9 | 🔴 |
| Bloqueos P0/P1 abiertos | abiertos | 5 | 0 | 🔴 |
| Muestras reales recibidas | M-1…M-4 / 4 | 0/4 | 4/4 | 🔴 |
| Spillover a la semana | tareas movidas | ____ | explícito | |

Notas de la semana:
- ______
```

Métricas medidas el 10-07 para la primera edición. Las reglas de `bitacora-diferencias.md`
(D1–D5) siguen aplicando a los desvíos numéricos que aparezcan.