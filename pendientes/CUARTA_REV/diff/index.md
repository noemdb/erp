### A. T14 — Alineación docs-código (parcial)

**`docs/ARCHITECTURE.md` — parche propuesto:**

```diff
- | Auth | Auth.js o Better Auth |
+ | Auth | Sesiones DB propias (ADR-030) — Argon2id, recuperación asistida |

- | Jobs | pg-boss worker |
+ | Jobs | `pg-boss` diferido (ADR-031); ejecutor `render:retry` + gatillos |

- ### Emisión
- El render PDF ocurre en la misma TX que la emisión.
+ ### Emisión (ADR-027)
+ Lock → `UPDATE document_series … RETURNING` → snapshot + audit **en TX**;
+ render PDF **fuera** de la TX (`pending` + `render:retry`).
```

**`docs/API.md` — parche propuesto:**

```diff
- ## Workers
- pg-boss gestiona la cola de render...
+ ## Render (diferido)
+ pg-boss diferido por ADR-031. Ejecutor `render:retry` + gatillos
+ (>5000 filas / >10s / >5 pendientes). Ver ADR-031.
```

### B. T15 — Tablero semanal (plantilla)

**`docs/tablero-semanal.md`:**

```markdown
# Tablero Semanal — Semana del ____

| Métrica | Fórmula | Valor | Meta | Estado |
|---------|---------|-------|------|--------|
| Firmadas ÷ requeridas | dorados firmados / 30 | ___/30 | 100% | 🔴/🟡/✅ |
| Dorados ÷ 30 | verdes / 30 | ___/30 | 100% | |
| Cobertura reglas | reglas con golden / total | ___/___ | ≥80% | |
| Incidentes | abiertos / cerrados | ___/___ | 0 abiertos | |
| Desvío real | (real − esperado) / esperado | ___% | <0.01 | |
| Spillover S1→S2 | tareas movidas | ___ | explícito | |

**Primera edición:** cierre de H0 (recalibrar k).
```

### C. T12 — Runbook rotación secretos (extracto accionable)

**`docs/runbooks/rotacion-secretos-2026-10.md`:**

```markdown
# Runbook — Rotación de Secretos (T12)

## §1 Rotación DB owner/app_runtime
1. Generar nueva clave con `openssl rand -base64 32`.
2. `ALTER ROLE app_runtime WITH PASSWORD '...'`.
3. Actualizar env en staging → probar conexión.
4. Actualizar env en prod → probar.
5. Verificar clave vieja rechazada.
6. Registrar en §6 firmado.

## §3 Resto de secretos
- AUTH_SECRET: rotar (invalida sesiones activas — avisar).
- FILE_SIGNING: rotar (re-firmar URLs pendientes).
- Almacenamiento: rotar credenciales UploadThing.
- Seeds: rotar claves de seed.

## §6 Tabla de registro
| Secreto | Fecha rotación | Responsable | Clave vieja rechazada | Firma |
|---------|----------------|-------------|----------------------|-------|
| DB owner | | | ☐ | |
| DB app_runtime | | | ☐ | |
| AUTH_SECRET | | | ☐ | |
| FILE_SIGNING | | | ☐ | |
| Almacenamiento | | | ☐ | |
| Seeds | | | ☐ | |
```

### D. T05 — Semilla de dorados (17 candidatos + ISLR)

**`docs/goldens/semilla-dorados-2026-10.md`:**

```markdown
# Semilla de Dorados — 17 candidatos + ISLR-07/ABONO-01…03

| # | ID | Caso | Esperado | Fuente | Estado |
|---|----|------|----------|--------|--------|
| 1 | G8-01 | Redondeo HALF_UP | ... | ADR-014 | ⛔ G8 |
| 2 | G8-02 | Tolerancia 0 | ... | Inv.8 | ⛔ G8 |
| 3 | G2-01 | Criterio pago | ... | ADR-017 | ⛔ G2 |
| 4 | G2-02 | Sustraendo parcial | ... | ADR-017 | ⛔ G2 |
| 5 | G2-03 | IVA consume eventos | ... | T07 | ⛔ G2 |
| 6 | G9-01 | Formato serie ISLR | ... | G9 | ⛔ G9 |
| 7 | G9-02 | Reinicio serie | ... | G9 | ⛔ G9 |
| 8 | ISLR-07 | Retención servicios | ... | Borrador | 🟡 |
| 9 | ABONO-01 | Abono a cuenta | ... | CU-05 | 🟡 |
| 10 | ABONO-02 | Pago parcial | ... | CU-05 | 🟡 |
| 11 | ABONO-03 | Pago total | ... | CU-05 | 🟡 |
| 12-17 | ... | 6 casos base IVA | ... | F2 | 🟡 |

> **Truncado aquí (quinta revisión, 2026-10-07).** La semilla completa se trabaja en
> `pendientes/QUINTA_REV/taskIN/CONSOLIDADO-TASK.md` (Q-07) con el detalle por fila.
> - Origen: `pendientes/PRIMERA_REV/dorados-propuestos-F0.json` (17 candidatos) +
> `pendientes/SEGUNDA_REV/dorados-normalizados/` (IVA-01…05, ISLR-01…09, ABONO-01…03).
> `ISLR-09` corregido (base 900 → 306,00) sin verificar con el contador → `⛔`.
> Recordatorio de dependencia: los dorados con `⛔ G8/G2/G9` no son reproducibles hasta que el
> RDF correspondiente esté firmado (`GATE_NO_RDF` impide activar la regla que los autoriza).

## E. Tablero semanal (plantilla) — aplicado en QUINTA_REV

La plantilla de §B quedó aplicada y con primera edición en
`pendientes/QUINTA_REV/seguimiento/tablero-semanal.md`.


