# Tasks QUINTA_REV — consolidado (2026-10-07)

> Predecesor: `pendientes/CUARTA_REV/taskIN/CONSOLIDADO-TASK.md` (05-oct).
> Cambia el criterio de esta revisión: **Q-\* no dependen de nadie**, T-\* las que dependían siguen
> dependiendo. Las T01–T15 conservan su estado real; las Q-\* son el trabajo que quedó sin dueño.
> Leyenda: 🔲 pendiente · 🟡 parcial · ✅ hecho · ⛔ bloqueado por firma · ⏱ con fecha límite.

## Cambio de criterio respecto a la cuarta revisión

| | CUARTA_REV | QUINTA_REV |
|---|---|---|
| Quién bloquea | 14 de 15 tareas dependían del contador | 7 de 19 no dependen de nadie |
| Trabajo sin dueño | T14/T15 "de bajo valor" | Q-01…Q-07 con dueño y aceptación |
| Verificación | por lectura | por ejecución (snapshot, gate, schema) |

---

## A — Sin dependencia externa (empezar aquí)

### Q-01 · T14 Auth en ARCHITECTURE 🔴 P1
`ARCHITECTURE.md:25` dice "Auth.js o Better Auth, sesiones en DB *(elegir en F1)*". ADR-030 está
aceptada e implementada: son sesiones DB propias con Argon2id. Parche listo en
`CUARTA_REV/diff/index.md §A`.
**Aceptación:** línea alineada con ADR-030; sin eco de "elegir en F1" en el doc; CHANGELOG.

### Q-02 · T14 pg-boss en mermaid y API 🔴 P1
`ARCHITECTURE.md:65` (`Q[pg-boss jobs]`), `:227` (`worker (pg-boss, PDF)`), `:29` ("Chromium
headless en el worker") y `API.md:163` ("PDF vía HTML→Chromium en worker"). ADR-031 diferenció
`pg-boss`; lo real es `render:retry` + gatillos. **Nota:** `ARCHITECTURE.md:157` y `API.md:116`
ya están correctos: el doc está corregido a medias, que es peor que no corregido.
**Aceptación:** ningún diagrama ni frase presenta `pg-boss` como capacidad actual.

### Q-03 · DATABASE.md vs schema físico 🔴 P1
Documentadas y **no existentes**: `purchase_documents.voided_at/void_reason/replaces_id/branch_id/
fx_rate/fx_rate_date/attachments_count`; `payments.voided_at/void_reason`; `attachments` con
`mime_type/storage_path/uploaded_at/uploaded_by` (el físico es `mime/storage_key/created_by/created_at`).
Sin documentar: `companies` 8 columnas de branding (migración 0020), `withholding_rules.synthetic/
approved_by/approved_at/change_reason`, `iva_withholdings.render_status`.
Verificado contra `drizzle/migrations/meta/0021_snapshot.json`.
**Aceptación:** doc y snapshot coinciden en esas tablas; la nota de ADR-033 dice explícitamente
qué columnas **no** existen todavía y por qué.

### Q-04 · Script de verificación doc↔schema 🔲
La comparación de Q-03 se hizo a mano. Que no vuelva a hacer falta.
**Aceptación:** `scripts/verify-docs-schema.ts` que compare columnas documentadas vs snapshot y
liste diferencias; salida en el checklist del bloque; conectar a `acceptance:report` o al pre-commit.

### Q-05 · Alícuota: una sola escala 🟡 P2 (bug latente)
`purchase_document_lines.tax_rate`: fracción en import (`deriveAlicuota` → `0.160000`), porciento
en manual (`purchase-form.tsx:68` default `"16"`). El motor lo trata como fracción
(`compute.ts:35` `b.times(l.taxRate)`). Hoy no explota (el motor solo corre sobre dorados; Inv.1
suma el IVA capturado) pero el primer consumidor real de `tax_rate` espera un documento manual.
**Decisión (ver `roadmapRev5 A2`):** rechazar con `RATE_SCALE_INVALID` en vez de normalizar en
silencio. No requiere firma: la ENMIENDA E-2 ya fijó fracción.
**Aceptación:** Zod rechaza `16`; mensaje dice `0.16`; test que fije la convención; regresión con
`0.16` verde; CHANGELOG con la convención escrita.

### Q-06 · Higiene de referencias 🔲
- `CUARTA_REV/consolidado:198` y `:225` apuntan a `taskIN/T01–T15` + `00-INDICE.md` (no existen;
  hay un `CONSOLIDADO-TASK.md`) y a `TERCERA_REV/task/` (borrado).
- `CUARTA_REV/diff/index.md` truncado a mitad de la semilla de dorados (§D).
- `CUARTA_REV/consolidado` §8 dice "ADR-001–032" → 034.
**Aceptación:** cero rutas rotas en `pendientes/**` (verificación por enlace relativo).

### Q-07 · Completar la semilla de dorados 🔲 (trabajo nuestro, no del contador)
`diff/index.md §D` queda en la fila 12-17 sin cerrar. 17 candidatos + ISLR-07 + ABONO-01…03;
`ISLR-09` corregido (base 900 → 306,00) sin verificar con el contador.
**Aceptación:** tabla completa con ID, caso, esperado, fuente y estado por fila; los que dependen
de firma marcados `⛔` explícitamente.

### Q-08 · Tablero semanal (T15) 🔲
Plantilla en `diff/index.md §B` → `../seguimiento/tablero-semanal.md` con primera edición.
**Aceptación:** archivo con métricas medidas al 10-07 y fecha de próxima edición.

### Q-09 · Semilla de prueba del camino de firma 🔲
`../decisiones/ruta-firma-rdf.md` describe 7 pasos en la UI, pero **nadie lo ejecutó de punta a
punta con un firmante**. Probar con el rol contador sobre un RDF de prueba (y borrar después):
`draft → in_review → approved → signed`, verificar `content_sha256`, inmutabilidad y
`GATE_NO_RDF` bloqueando una regla sin vínculo.
**Aceptación:** el recorrido funciona sin ayuda externa; hallazgos anotados en la ruta.

### Q-10 · E-3 resuelto por verificación 🟢 P3
La ENMIENDA E-3 pregunté si `origin` existe en el schema. **Verificado 10-07: no existe.** El
seeder usa `--matrix-hash` + campo `synthetic` (`seed-company-rules.ts:104-123`). La deuda está
cerrada por la vía actual; solo falta escribirlo.
**Aceptación:** nota en la ENMIENDA o en `CONSOLIDADO-TASK` que cierre E-3; si nadie lo pide,
dejarlo aquí.

---

## B — Dependencia externa: contador (ruta crítica)

### T01 · Respuestas F0-01 ⏱ 🧪
Enviado 05-oct, 18 + 5 preguntas + post-cierre + piloto + M-1…M-4. **Sin acuse anotado.**
**Aceptación:** cada punto APROBADO/MODIFICAR/PENDIENTE con fecha; canal y acuse registrados.
**Nota:** T01 y B1 se solapan. B1 (RDF) es más corto y desbloquea más; T01 sigue siendo el
documento que cubre lo que B1 no toca (roles, calendario, entregables).

### T02 · Muestras M-1…M-4 ⏱ 16-oct 🧪
M-1 CSV ≥1 mes parseable · M-2 ≥1 Z por máquina · M-3 libros del mismo período · M-4 XLSX.
`import:autodetect` y `golden:inspect` ya corren; falta que lleguen.
**Aceptación:** cada muestra clasificada REAL/SINTÉTICA/INCOMPLETA/NO UTILIZABLE (`roadmapRev4 §5B`).
Sin muestra sintética como sustituto silencioso.

### T03 · Sesión 1 formal ⛔ 🟡
Sim de 6 pasos OK el 06-oct. Faltan los bloques **7** (ventas/NC/ND/Z), **9** (libros + Excel +
conciliación, nunca ejecutado con datos reales) y **11** (firma).
**Aceptación:** bloques 7, 9 y 11 con evidencia por caso (`roadmapRev4 §17`), IDs + SHA-256 +
auditoría; bloques 7 y 9 con datos reales, no sintéticos.

### T04 · Matriz v1 firmada ⛔ 06-nov
Borrador del 01-oct, 9 reglas transcritas. `seed:company-rules` con `--matrix-hash` y workflow
ADR-022 listos; sin firma no se activa nada (`GATE_NO_RDF` lo impide por diseño).
**Aceptación:** lote 1–2 cargados por workflow borrador→activo; `GATE_NO_COVERAGE`/`GATE_NO_RDF`
verificados en el camino.

### T05 · Dorados 30–50 ⛔
0/30 firmados. 1 fixture (`IVA-01`) sin firmar; `_manifest.umbralGolive=30`; firma ligada al
`sha256` canónico (ACC-02). Depende de Q-07 (semilla completa).
**Aceptación:** 30 firados; `goldens:check` y `acceptance:gate` verdes; sin omitidos.

### T12 · Rotación de secretos 🔲
El runbook con §1+§3+§6 es `docs/runbooks/incidente-serverc-2026-10-04.md` (verificado): su
tabla §6 tiene 2 filas en `pendiente` (rotación servidor §1 y rotación secretos §3) y 4 cerradas
(purge, escáner, borrado workspace, excepciones documentadas). `docs/runbooks/rotacion-secretos.md`
es genérico y **no** tiene §6: no sirve como registro de T12. Rotar DB owner, `app_runtime`,
`AUTH_SECRET`, `FILE_SIGNING`, storage, seeds.
**Aceptación:** clave vieja rechazada verificada; tabla §6 con fecha, responsable y firma.
**Nota:** el incidente `serverc` (ADR-029) se cerró en repo pero no en servidor. Esto es lo que
evita que se repita.

### T13 · Rol mínimo + restore drill 🔲
`DB_LEAST_PRIVILEGE=true` en staging (dev sigue owner hasta migrar seeds a `withTenant`); drill
real con RPO/RTO medidos.
**Aceptación:** staging con rol mínimo operativo; `TST-01` verde (hoy falla 77/78 **solo** por la
credencial `app_runtime` del entorno local); RPO/RTO registrados y firmados.

---

## C — Bloqueadas por firma (ya preparadas por ADR-034)

| ID | Bloquea | Preparado por |
|---|---|---|
| T06 · redondeo + tolerancia única | T05, T10 | `tax-engine/calibrate.ts` (`g8:calibrate`, 8 combinaciones método×etapa) |
| T07 · G2 + IVA consume eventos + ADR-033 | T05, T10 | migraciones 0011/0012 (`abono_criterion`, preview dual); `g2:divergence` |
| T08 · catálogos + modo Z + perfiles | T10 | `import:autodetect`, `catalog:load` |
| T09 · Excel + paridad art. 16 | T10 | `golden:inspect`, `golden:compare` (D1–D5) |
| T10 · mes real + M5 | T11 | `acceptance/period-reconciliation/` |
| T11 · UAT + cutover + go-live | — | `docs/uat/`, `docs/manuales/`, `acta-aceptacion.md` |

**T06 en detalle:** dos tolerancias conviven (`0.01` provisional en `computeDocumentTaxes` y
`summary.ts:57`; `"0"` como meta Inv.8 en `excel-compare.ts:9`). Una sola, decided por G8.

**T07 en detalle:** ADR-033 es propuesta pero **el código ya depende de ella**: `voided` se excluye
de libro/resumen/conciliación, y la NC **suma** en los agregados. La parte fácil está hecha, la
difícil no. Riesgo documentado en `consolidado-docs-2026-10-07.md §5.6`.

---

## Orden

```text
esta semana:  Q-01 Q-02 Q-03 → Q-05 → Q-06 Q-07 Q-08 → Q-09 Q-10 → T12 T13
en paralelo:   T02 (16-oct) · T01 · B1/B2 (7 RDF + decisión G4) → T03 → T04 → T05
después:       T06 T07 T08 T09 T10 T11
```

## Lo que NO depende del contador y por tanto no es excusa

Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-07, Q-08, Q-09, Q-10, T12, T13. **Doce bloques.**
Si el contador no responde esta semana, el equipo sigue entregando.