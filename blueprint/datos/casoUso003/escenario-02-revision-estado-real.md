# Escenario 2 (estado real): Revisión y resolución de divergencias — casoUso003

> Lote ejemplo: `f785fdcc-9185-4289-8731-263c0ba2620c` · Empresa `a1f8bba4-f088-4a71-942a-2fad94820cf0`
> Archivo: `compras-septiembre-legacy.csv` (10 filas) · Fecha: 2026-10-05
> Rol: `administrativo` o `contador` (permiso `imports.run`). Auditor: solo lectura.
> Rutas base: `/c/[companyId]/importaciones/[batchId]`, `/c/[companyId]/compras`, `/c/[companyId]/pagos`, `/c/[companyId]/auditoria`.

## Addendum 2026-10-05 — corrección aplicada (ND→NC)

La §2.2 quedó ejecutada y verificada en UI + código + docs (`TODO ✅`, `CHANGELOG 2026-10-05`):

* Hallazgo: la fila 9 se había registrado manual como `debit_note 716917eb` con `fecha_fiscal 2026-09-10` (tipo invertido + período equivocado).
* Corrección: `voidPurchaseDocument` (motivo `tipo incorrecto: era NC, no ND`, actor contador) → ND `716917eb` a `voided` (excluida de `getPurchaseBook`/`getIvaSummary`/`getConciliation`); NC `6acc6ce7` creada como `credit_note 001-00004/12348`, afectado `001-00001 (725a176b…)`, fechas `2023-09-10/11/10`.
* Estado final: Compras muestra 10 activos (9F+1NC) ordenados por fecha fiscal, `Base 10.000,00 / IVA 1.588,15 / Total 11.588,15`. El lote sigue en `Parcial 9+1` (esperado: el lote no se auto-reconcilia con el registro manual).
* Evidencia en bitácora: `void` sobre `716917eb` + `create` de `6acc6ce7` (filtros §4).
* Deudas intactas, no bloquearon el cierre de María: signo NC en agregados suma en vez de restar (requiere ADR, ver ADR-033) y `voided_at` documentado en `DATABASE.md:321` sin columna física (motivo vive en `audit_events.reason`).

## 0. Guía original vs. código real (leer primero)

La `guia-simulacion-maria.md` describe un flujo ideal que **no existe** en el código:

| Guía (ideal) | Código real |
|---|---|
| Modal de divergencia + `Aceptar valor calculado` | No existe. Sin edición inline en staging. |
| Server Action `updateImportRow` | No existe (`src/modules/imports/actions.ts` solo expone `validateBatchAction` y `confirmImportAction`). |
| Estados `ready_for_review` / `adjusted_by_user`, log `row_adjusted` | No existen. Lote: `uploaded\|validated\|partially_imported\|completed` (`labels.ts`). Fila: `valid\|warning\|rejected\|imported`. |
| Divergencia `monto_iva CSV vs base_imponible * alícuota` (filas 3 y 4) | No implementada. `validate.ts` solo verifica `base_imponible + iva_causado = total` con tolerancia `0.01`, más `tipo_doc`, `abono_en_cuenta`, tercero nuevo/duplicado, RIF/fechas. |
| `alicuota_iva / fecha_recepcion` consumidas | Ignoradas y visibles en banner `Columnas no consumidas` (`mapping_profile.ignoredColumns`). Alícuota se deriva `iva/base` al confirmar. |

Consecuencia: en este lote las filas 3 (`1000.00 + 160.05 = 1160.05`) y 4 (`2000.00 + 320.10 = 2320.10`) **cuadran y quedan `Importada` sin aviso**. No hay nada que corregir en ellas.

Estado actual del lote ejemplo: `Parcial` (`partially_imported`), `Total 10 | Válidas 0 | Advertencias 9 | Rechazadas 1`. Filas 1–8 y 10 `Importada`, fila 5 `Importada` con aviso G2, fila 9 `Rechazada`. Eso significa que el Escenario 3 (`confirmImport`) **ya corrió**: 9 documentos ya viven en `purchase_documents`. Las filas `Importada` son inmutables (`validate.ts`: `delete … where status != 'imported'` + `if (imported.has(n)) continue`).

## 1. Punto de partida: verificar el lote

1. Abrir `/c/[companyId]/importaciones/[batchId]`.
2. Confirmar badge `Parcial` + texto `Puedes confirmar de nuevo tras corregir las rechazadas.`
3. Leer KPIs (`batch.totalRows|validRows|warningRows|rejectedRows`): son la foto de la validación, no el estado vivo.
4. Leer banner `Columnas informativas no consumidas: aliquota_iva (alícuota informativa: se deriva iva/base al confirmar); fecha_recepcion (fecha informativa: la fecha fiscal sale de fecha_documento).`
5. Recorrer `Filas del lote` (sin filtro por estado en UI actual, 10 en orden de archivo, columna `Errores / avisos` con `title` completo al hover).

## 2. Fila 9 rechazada — NC `001-00004` (única bloqueante)

Fila CSV: `2023-09-10,2023-09-11,J-12345678-9,INSUMOS CARACAS C.A.,001-00004,12348,100.00,16,16.00,116.00,NC,0.00`.

### 2.1 Descargar evidencia

1. Clic `Descargar rechazadas` → `GET /api/companies/[companyId]/imports/[batchId]/rejected.csv`.
2. Se obtiene la cabecera original + columna `errores` con: `tipo_doc 'NC' no soportado en importación (NC/ND requieren documento afectado; regístrela manual)`.
3. Archivar el CSV: justifica por qué el lote quedó `Parcial` y no `Completado`.

Motivo de dominio: toda nota de crédito / nota de débito exige `documento_afectado_id` y respeta Inv.3 (NC ≤ saldo del afectado). Por eso el importador la rechaza en vez de crear una factura común.

### 2.2 Registrar la NC manual en `/c/[companyId]/compras/nueva`

1. `Proveedor > Buscar en registrados`: elegir `J-12345678-9 / INSUMOS CARACAS C.A.` (creado al confirmar; si no aparece, escribir RIF + razón social, se crea al guardar).
2. `Documento > Tipo`: `Nota de crédito`.
3. `N° factura`: `001-00004`. `N° control`: `12348`.
4. `Fecha documento`: `2023-09-10`. `Fecha recepción`: `2023-09-11`. `Fecha fiscal`: `2023-09-10` (determina el período fiscal; la fecha de registro nunca la sustituye).
5. `Documento afectado`: obligatorio (`MISSING_AFFECTED_DOCUMENT` si se omite). Elegir `001-00001` (alternativas del mismo proveedor: `00002`, `00003`).
6. `Líneas`: 1 línea `Gravada general`, `Alícuota 16`, `Base imponible 100.00`, `IVA 16.00`. `Total documento 116.00`. Esperar badge `Cuadra Inv.1`; sin cuadre el botón se deshabilita (`TOTAL_MISMATCH`).
7. `Guardar compra` → redirige a `/compras`.

Errores posibles: `CREDIT_NOTE_EXCEEDS_BALANCE`, `DUPLICATE_DOCUMENT`, `PERIOD_CLOSED`, `VALIDATION_ERROR`.

Resultado: 9 importadas + 1 manual = 10 filas del CSV cubiertas.

## 3. Fila 5 — aviso G2 `abono_en_cuenta 1500.00` (no bloqueante)

Fila CSV: `2023-09-05,2023-09-06,J-11122233-4,SERVICIOS GLOBALES,004-00099,11122,3000.00,16,480.00,3480.00,F,1500.00`. Documento importado **sin** el abono. Aviso en fila: `aviso: abono_en_cuenta 1500.00: requiere evento de liquidación manual (G2); el documento se importa sin el abono`.

### 3.1 Verificar criterio en `/c/[companyId]/pagos`

Badge esperado: `Criterio G2 sin definir` (`unset`): solo se emite ISLR sobre pagos asignados si ambos escenarios convergen. Solo el contador puede cambiarlo en `/configuracion` con motivo auditado. No se infieren abonos automáticamente.

### 3.2 Registrar evento solo con soporte, en `/c/[companyId]/pagos/nuevo`

María no inventa el dato: pide a contabilidad si los `1500.00` fueron pago o abono contable.

* Beneficiario: `J-11122233-4` (debe existir activo; si no, crearlo en `Terceros`, el servidor responde `NOT_FOUND`).
* Si fue salida de fondos → `Tipo: Pago` + `Método` (transferencia, pago móvil, efectivo, cheque, tarjeta, depósito, otro) + `Fecha del evento` real + `Monto 1500.00` (punto decimal, 2 decimales) + `Referencia` (N° transferencia).
* Si fue acreditación contable → `Tipo: Abono en cuenta` (sin método) + `Fecha` contable + `Referencia contable` (N° asiento verificable).
* `Dato inferido`: marcar solo si se deduce sin soporte directo (queda auditado).
* Con `unset`, el formulario advierte que un abono no podrá emitirse hasta convergencia o criterio explícito. Es normal.
* `Guardar evento` → detalle `/pagos/[id]` → asignar a la compra `004-00099`. Registrar o asignar **no emite retención** por sí solo.

Para cerrar la simulación de María basta dejar anotado: `fila 5 pendiente de evento G2 + asignación; decide el contador`. No crear eventos ficticios.

┌─────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│Campo                        │Valor                                                                                                           │
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│RIF beneficiario             │J-11122233-4 (Buscar en registrados → SERVICIOS GLOBALES, debe decir “Tercero encontrado y activo”)             │
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│Tipo de evento               │Pago (si eliges Abono en cuenta el formulario te advierte que con unset no podrá emitirse ISLR)                 │
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│Fecha del evento             │2023-09-06 (asumida = fecha_recepcion del CSV; cae en período septiembre-2023)                                  │
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│Monto                        │1500.00 (punto, 2 decimales)                                                                                    │
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│Método de pago               │Sin especificar (lo honesto sin soporte; evita inventar transferencia)                                          │
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│Referencia                   │CSV fila 5 / 004-00099 / abono_en_cuenta 1500.00 (simulación casoUso003)                                        │
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│Dato inferido                │sin marcar (el monto tiene soporte CSV; el tipo queda declarado en la referencia)                               │
└─────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

## 4. Verificar handoff al contador (Carlos)

* `/c/[companyId]/compras`: 9 importados + 1 NC manual. Abrir uno: su línea de tiempo indica `origen lote f785… · fila N` y enlaza a archivo + fila (`source_file_id + row_number + import_batch_id`).
* `/c/[companyId]/terceros`: deben existir los 6 RIF del archivo: `J-12345678-9, J-98765432-1, J-55566677-8, J-11122233-4, J-44455566-7, J-77788899-0`.
* `/c/[companyId]/auditoria` (permiso `audit.read`, append-only, `REVOKE UPDATE, DELETE` en DB):
  - Filtro `Tipo de entidad = Lote (import_batch)` + `Acción = confirm` + `ID = f785…` → eventos `upload` y `confirm` con `after:{created:9}`.
  - Filtro `Tipo = Compra` → `create` de los 9 documentos.
  - `Exportar CSV` archiva la bitácora con los mismos filtros. No buscar `row_adjusted` ni `divergence_detected`: no existen en este flujo.

## 5. Checklist de cierre María → Carlos (2026-10-05: completo salvo G2 pendiente contador)

- [x] Lote en `Parcial`: 9 `Importada`, 1 `Rechazada` excluida entendida.
- [x] `rejected.csv` descargado y archivado.
- [x] NC `001-00004` registrada como `credit_note 6acc6ce7` contra `001-00001`, cuadra Inv.1, fechas 2023-09-10/11/10 (la ND errada `716917eb` quedó `voided` con motivo auditado).
- [ ] Fila 5 anotada para evento de liquidación G2 (tipo, fecha, monto y soporte pendientes del contador — María no inventa el dato).
- [x] Banner `alicuota_iva / fecha_recepcion` entendido como columnas no consumidas.
- [x] Compras (9+1), terceros (6) y bitácora (`upload`/`confirm`/`void`/`create`) verificables en ≤3 clics.

Nota de repetición: para practicar el estado `Validado` previo a confirmar, subir el CSV con otro nombre (el `sha256` distinto evita la idempotencia por `(company_id, sha256)` en `service.ts`) y detenerse antes de pulsar `Confirmar (importar válidas)`. El botón es idempotente: las filas `Importada` se saltan y solo reintenta pendientes.

## 6. Escenario 4 — cierre María (solo lectura) + pase a Carlos (2026-10-05)

Solo lectura, cualquier rol con `audit.read` (`/c/[companyId]/auditoria`, append-only, `REVOKE UPDATE, DELETE`):

1. Filtro `Tipo = Lote (import_batch)` + `ID = f785…` → `upload` + `confirm (after:{created:9})`.
2. Filtro `Tipo = Compra` → 9 `create` de importación + `create` NC `6acc6ce7`.
3. Filtro `Tipo = Compra` + `ID = 716917eb…` → `void` con motivo `tipo incorrecto: era NC, no ND` (actor contador).
4. `Exportar CSV` archiva la bitácora con los mismos filtros (neutralizado anti-inyección).
5. Línea de tiempo por documento: `?entityType=purchase_document&entityId=[id]` muestra `origen lote f785… · fila N` o `registro manual sin lote` (NC) — respuesta a “¿de dónde salió?” en ≤3 clics.
6. Checklist fin de María: subir sin errores de formato ✓ / 1 rechazo NC detectado ✓ / corrección sin rehacer CSV (manual + anulación) ✓ / rastro en bitácora ✓ / edición bloqueada tras confirmar ✓ / handoff a Carlos ✓ (pendiente solo evento G2 fila 5).

Pase a Carlos (contador, único con `withholdings.issue` / `rules.edit`):

* IVA en `/c/[companyId]/retenciones/nueva`: `listEligiblePurchases` trae validadas con IVA>0 no retenidas — incluye la NC `001-00004`, **excluirla a mano del preview** (aún no hay filtro por `kind`; las 9 facturas sí entran). `Previsualizar cálculo` (`previewIvaAction`, no persiste) antes de `Emitir`; la emisión exige período abierto y reserva `UPDATE series RETURNING` sin huecos. En simulación: solo preview, no emitir (gates F0: matriz v1 + dorados sin firma; deuda signo NC pendiente de ADR-033).
* ISLR en `/c/[companyId]/retenciones-islr/nueva`: exige evento de liquidación asignado (fila 5 pendiente) + concepto + base; `previewIslrAction` compara `payment_only` vs `account_credit_or_payment` bajo `unset` (fail-closed salvo convergencia). En simulación: solo preview dual, no emitir ni cambiar criterio (solo contador con motivo; no equivale a aprobación fiscal).
* Cierre en `/c/[companyId]/periodos` + `/reportes (libro-compras, resumen-iva)`: bloqueado hasta sanear signo NC y contar con matriz/dorados firmados.
