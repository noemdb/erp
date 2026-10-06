# Retrospectiva — simulación casoUso003 (María → Carlos, 2026-10-05/06)

Empresa `a1f8bba4-…` (“Empresa Demo”), lote `f785fdcc-…`, CSV 10 filas septiembre.

## Resultado
María cerrada 6/6 (lote `Parcial` 9+1, NC manual correcta, evento G2 creado, bitácora 15 eventos archivada). Carlos demostrado solo en `preview` (IVA 1 factura: `160,00 × 75% = 120,00`, regla `729a1707`); emisión y cierre bloqueados por gates F0 + ADR-033.

## Lo que funcionó
Staging idempotente (`sha256`), validación con contadores, `rejected.csv`, NC rechazada por `tipo_doc`, aviso G2 sin bloquear, `confirmImport` idempotente, `voidPurchaseDocument` + re-creación (ND→NC), bitácora con filtros/timeline/export, preview IVA con `ruleVersionId + explanation[]`.

## Hallazgos (síntoma → causa → acción)

1. **Guía ideal vs código**: modal `Aceptar valor calculado`, `updateImportRow`, `ready_for_review/adjusted_by_user` no existen. Acción: la guía estado-real documenta el flujo real; no prometer edición inline.
2. **Divergencia IVA filas 3-4 nunca dispara**: el validador solo verifica `base+iva=total` (tol 0,01), no `base×alícuota`. Acción: documentado; si se quiere, es feature nueva con ADR de redondeo (G8).
3. **NC en CSV siempre rechaza** (`tipo_doc≠F`): correcto por Inv.3, pero sorprendió. Acción: v2 mantiene la fila como demo de rechazo + paso manual obligatorio.
4. **ND registrada en vez de NC + fecha 2026** (error operador): el formulario no advierte. Acción: checklist de tipo/fecha en la guía; a futuro, pre-rellenar desde `rejected.csv`.
5. **NC suma en vez de restar** en libro/resumen + aparece como elegible IVA. Acción: ADR-033 propuesta (sin código hasta firma).
6. **`voided_at/reason/replaces_id` sin columna física** (`fiscal-docs.ts` vs `DATABASE.md:321`). Acción: ADR-033 propone migración aditiva.
7. **Agente IVA desactivado por defecto** bloquea hasta el preview. Acción: en el rerun se activa en el paso exacto (no antes, para demostrar el bloqueo).
8. **Perfiles `sujeto_retencion_iva=false` por defecto** → `NOT_APPLICABLE` en preview. Acción: paso explícito de perfiles con vigencia que cubra la fecha fiscal.
9. **Regla seed `[2025-01-01,)` no cubre fechas 2023** → `sin regla vigente`. Acción: v2 mueve el CSV a septiembre-2025 (ver abajo).
10. **Etiqueta `settlement_event` vs filtro `payment`** en bitácora; `fecha emisión` por defecto = hoy (saca de período). Acción: deuda menor + paso que fija fecha explícita.
11. **Método de pago inventado** (`Transferencia` sin soporte). Acción: en rerun usar `Sin especificar` + referencia que declare la simulación.

## Métricas
10 documentos (9F+1NC), 6 terceros, 1 evento G2, 15 eventos auditoría, typecheck limpio, lint 0 errores; suites DB solo verificables con Neon dev (en local sin env: 11/11 puros, 9 ficheros exigen env).
