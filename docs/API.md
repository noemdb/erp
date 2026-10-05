# API.md — ERP-TributarioLite

> Contrato de Server Actions + Route Handlers. Estado: **v0.1 (parcialmente implementado)**. Se refina por bloque en F1→F6. Fuente: `ARCHITECTURE.md` (estilo, errores, idempotencia), `DOMAIN.md` (invariantes, estados), `DATABASE.md` (tablas, constraints), `ROADMAP` G1–G12.
> Sin API pública en v1. Todo acceso pasa por `withTenant(ctx, fn)` + `authorize(ctx, action, resource)` + RLS.

## Convenciones generales

- **Estilo:** Server Actions tipadas (`"use server"`) para mutaciones UI. Route Handlers solo para subida CSV, descarga PDF/Excel/adjuntos y health. Sin REST pública.
- **Prefijo handlers:** `/api/companies/[companyId]/...` + `/api/health`. Empresa activa también viaja en URL app `(app)/[companyId]/...`.
- **Auth:** cookie de sesión en DB (`HttpOnly`, `Secure`, `SameSite=Lax`). Sesión → `ctx { userId, companyId, role }`. Rol × empresa desde `company_user`. Proveedor sin login v1.
- **Éxito (actions):** retorno directo tipado o `{ data }`. **Éxito (handlers descarga):** binario con `Content-Type` + `Content-Disposition: attachment`.
- **Error estándar:**
  ```json
  { "error": { "code": "PERIOD_CLOSED", "message": "...", "details": {} } }
  ```
- **Validación:** Zod en servidor (autoridad). Cliente reutiliza schemas como conveniencia. Dinero como string decimal, nunca `number`.
- **Idempotencia:** importaciones por `sha256(archivo)` + clave natural; confirmación de lote + emisión de comprobantes aceptan `Idempotency-Key` / `clientRequestId`. Reintento seguro no duplica.
- **Auditoría:** toda mutación escribe `audit_events` en la misma TX (actor, entity, before/after, motivo, tx_id).
- **Rate limiting:** ver `SECURITY.md`. Estricto en login, importación y emisión.

### Códigos de error de dominio (estables)

| Code | Cuándo |
|---|---|
| `UNAUTHENTICATED` / `FORBIDDEN` / `NOT_FOUND` | Sesión, rol×empresa, RLS |
| `VALIDATION_ERROR` | Zod falla (detalles por campo) |
| `PERIOD_CLOSED` | Mutación sobre `fiscal_periods.status='closed'` (app + trigger DB) |
| `PERIOD_NOT_OPEN` | Acción requiere período `open`/`under_review` |
| `DUPLICATE_DOCUMENT` | Viola `UNIQUE(company_id, party_id, kind, doc_number, control_number)` o `sha256` existente |
| `CREDIT_NOTE_EXCEEDS_BALANCE` | NC > saldo documento afectado (Inv. 3) |
| `RETENTION_EXCEEDS_VAT` | `retained > vat + tolerancia` sin regla explícita (Inv. 2) |
| `G2_EVENT_REVIEW_REQUIRED` | Criterio G2 sin configurar/no convergente, evento no es disparador permitido o falta asignación verificable |
| `TOTAL_MISMATCH` | `base+iva != total` fuera de tolerancia ADR-014 (Inv. 1) |
| `MISSING_AFFECTED_DOCUMENT` | NC/ND sin `affected_document_id` |
| `SERIES_EXHAUSTED` / `SERIES_NOT_FOUND` | Serie inactiva o sin definir (G9 ISLR) |
| `INVALID_STATE_TRANSITION` | Transición fuera de máquina de estados DOMAIN |
| `IMPORT_HAS_ERRORS` | Lote con filas `rejected`, requiere corrección o importar solo válidas |
| `REPORT_NOT_REPRODUCIBLE` | Regenerado difiere `sha256` de `report_versions` |
| `RATE_LIMITED` | 429 |

## identity — auth y usuarios

### `login(email, password)`
- Auth: no. Rate limit estricto.
- Request: `z.object({ email: z.string().email(), password: z.string().min(8) })`
- Efectos: crea sesión DB, set cookie. `users.last_login_at`.
- Errores: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `RATE_LIMITED`.

### `logout()`, `issueResetLink(email)` (solo admin, enlace un solo uso por canal externo), `consumeResetLink(token, password)` (invalida sesiones+tokens, TTL 60 min)

### `listCompanyUsers(companyId)` / `setUserRole(companyId, userId, role)`
- Roles: `admin | administrativo | contador | auditor | supplier(reservado)`. Solo `admin sistema` gestiona (matriz ROADMAP §8). Emisión/anulación y cierre solo `contador` (+motivo).

## tenancy — empresas y sucursales

### `createCompany(input)` / `updateCompanyFiscalProfile(companyId, input)`
- Campos: `rif, rif_original, razon_social, domicilio_fiscal, condicion_iva, contribuyente_especial_desde, agente_retencion_iva/islr, period_kind monthly|biweekly (G1), currency_functional default VES (G4 reservado), status`.
- RIF: valida estructura, guarda original + normalizado (`citext`).
- Solo admin. `period_kind` inmutable si existen períodos cerrados (requiere ADR).

### `updateFiscalProfile(companyId, { condicionIva, contribuyenteEspecialDesde?, agenteRetencionIva, agenteRetencionIslr, periodKind })`
- Solo admin (`companies.manage`). Escribe `audit_events(action:config)` en la misma TX con antes/después.
- `periodKind monthly|biweekly`: si cambia con períodos `closed`/`reopened` existentes → `VALIDATION_ERROR`.

### `createBranch(companyId, { codigo, nombre, direccion })`
- `UNIQUE(company_id, codigo)`. Opcional v1, `branch_id` nullable en documentos.

## parties — terceros

### `upsertParty(companyId, input)`
- `rif, rif_original, razon_social, direccion_fiscal`. `UNIQUE(company_id, rif) WHERE status='active'`.
- Errores: `DUPLICATE_DOCUMENT` (mapeado a tercero), `VALIDATION_ERROR` RIF.

### `setPartyTaxProfile(partyId, { tipo_persona, residente, condicion_iva, sujeto_retencion_iva/islr, effective_range })`
- Historial con `EXCLUDE USING gist (party_id WITH =, effective_range WITH &&)`. No overwrite, cierre + apertura.

## fiscal-docs — compras, ventas, pagos

Común: `fecha_fiscal` determina `fiscal_period_id`, nunca se sustituye por fecha registro. `currency/fx_rate/fx_rate_date` reservados (G4). Bloqueo si período `closed`.

### `createPurchaseDocument(companyId, input)`
- Request (resumen, ver `DATABASE.md` Zod): `branchId?, fiscalPeriodId, kind invoice|credit_note|debit_note|import|exempt|no_credit, partyId, docNumber, controlNumber, affectedDocumentId? (obligatorio NC/ND), fechaDocumento/Recepcion/Fiscal, baseImponible/ivaCausado/total strings, lines[{taxCategory, taxRate?, base, iva}]`.
- Reglas: Inv.1 total, Inv.3 NC≤saldo, duplicados, tercero activo.
- Efectos: `purchase_documents + lines`, `audit_events`. Calcula impuestos vía `tax-engine.computeDocumentTaxes` y guarda `rule_version_id` si aplica.
- Errores: `TOTAL_MISMATCH`, `DUPLICATE_DOCUMENT`, `CREDIT_NOTE_EXCEEDS_BALANCE`, `MISSING_AFFECTED_DOCUMENT`, `PERIOD_CLOSED`.

### `voidPurchaseDocument(id, { reason })` — anula sin borrar, exige motivo, conserva número. Si período cerrado requiere reapertura o `fiscal_adjustments`.

### `createSalesDocument(...)` — análogo + `kind invoice|z_summary|credit_note|debit_note|export|third_party`, `range_from/to` solo Z, `source_type imported|manual` (`electronically_issued` reservado v2), `machine_id/z_report_id?`. Regla G7: no mezclar factura individual + Z misma sucursal/período (validación app).

### `createSettlementEvent(companyId, { partyRif, eventType, eventDate, amount, currency?, method?, sourceRef?, inferred? })` + `allocateSettlementEvent(eventId, purchaseDocumentId, amount)`
- `eventType`: `payment | account_credit`. No es tesorería ni conciliación bancaria.
- `eventDate` es la fecha efectiva del pago o del abono contable. El sistema no infiere abonos automáticamente; `inferred` debe declararse explícitamente y queda auditado.
- La asignación exige que el beneficiario coincida con el proveedor y valida concurrentemente que no supere el importe del evento ni el total ya asignado a la compra.
- Capturar/asignar un evento **no emite ni calcula por sí solo una retención**. La emisión ISLR se rige por el criterio G2 de la empresa descrito abajo: con `unset`, solo admite pagos asignados si los escenarios convergen; con `account_credit_or_payment` configurado, puede admitir un abono asignado si cumple las validaciones del disparador. Esto no valida la atribución fiscal de base por porción ni sustituye la aprobación del contador. IVA aún no consume eventos.
- La migración 0011 agrega metadatos a las tablas físicas existentes (`payments`, `payment_allocations`) y preserva ids/datos; no renombra tablas durante esta fase estructural.

## imports — staging CSV

### `POST /api/companies/[companyId]/imports/upload` (Route Handler, multipart)
- Campos: `kind purchases|sales|iva_withholdings|islr_withholdings|z_reports`, `source_system legacy_accounting|fiscal_machine|manual`, `file`.
- Guarda `source_files (sha256, bytes, original_name)` → `import_batches (mapping_profile?, fiscal_period_id?)`. `UNIQUE(company_id, sha256)` → si existe retorna batch existente (idempotencia).
- Límites `MAX_UPLOAD_MB`, validación tipo por contenido, fuera webroot.

### `applyMappingProfile(batchId, mapping)` / `validateBatch(batchId)`
- Parser: separador/encoding/BOM, coma/punto decimal, fechas múltiples, RIF con/sin guiones, nulos (`0`, vacío, `N/A`, `*`).
- Alias legacy: `monto_iva→iva`, `total_factura→total`, `nombre_proveedor→razon` (además de los existentes `numero_factura`, `base_imponible`, etc.).
- Clasifica por fila `pending|valid|warning|rejected|imported` en `import_rows (raw, normalized, errors)`. Detecta duplicados intra-archivo y contra BD, RIF inválido, total mismatch, tercero inexistente, salto Z.
- Avisos explícitos (nada fiscal se ignora en silencio): `tipo_doc` distinto de factura se **rechaza** (NC/ND requieren documento afectado, van a registro manual); `abono_en_cuenta≠0` deja la fila en **warning** con aviso (el abono exige evento de liquidación manual G2); `alicuota_iva/fecha_recepcion` quedan en `mapping_profile.ignoredColumns` y se muestran en el detalle del lote (la alícuota se deriva `iva/base` al confirmar).
- Retención importada vs recalculada: marca diferencia, nunca sobrescribe.

### `confirmImport(batchId, { onlyValid: true, clientRequestId })`
- TX atómica: filas `valid (+warning si autorizado)` → documentos definitivos con `source_file_id + row_number + import_batch_id`. Actualiza contadores lote `total/valid/warning/rejected`. Estado `completed|partially_imported`.
- Archivos grandes: reintento por planificador del host (`render:retry`, ADR-031); cola `pg-boss` diferida. Re-subida mismo `sha256` no duplica.
- `GET /api/companies/[companyId]/imports/[batchId]/rejected.csv` descarga rechazadas para corrección.

### `GET /api/companies/[companyId]/imports/template?kind=` (Route Handler, descarga)
- `kind purchases|sales|z_reports`. Requiere sesión + `reports.read`. Retorna CSV con BOM, columnas canónicas del validador + 1 fila de ejemplo, como `attachment` (`plantilla-*.csv`). Tipos de retención aún no soportados por el validador no tienen plantilla.

## withholdings — IVA / ISLR

### Criterio G2 y comparación previa ISLR

- Cada empresa tiene `abono_criterion`: `unset` (default), `payment_only` o `account_credit_or_payment`. `configureAbonoCriterionAction(companyId, { criterion, reason })` solo admite rol Contador; exige motivo y audita valores anterior/nuevo en la misma transacción. Elegir un valor es configuración operativa, no aprobación legal ni cierre F0.
- `previewIslrAction(companyId, input)` presenta en paralelo ambos escenarios: fecha efectiva/período, evento, base, versión de regla, porcentaje, sustraendo, condiciones (incluida UT solo si está parametrizada) y monto calculado. El cálculo alternativo reutiliza la base ingresada para comparar; no atribuye automáticamente la base por porción ni decide sustraendo.
- Con `unset`, solo se puede emitir un evento `payment` si ambos escenarios son calculables y coinciden en fecha, período, versión de regla, base, importe/moneda del evento y asignaciones por documento. Eventos no asignados, crédito anterior sin asignación, o divergencia bloquean con `G2_EVENT_REVIEW_REQUIRED`; nunca se consume número en el bloqueo. Un `account_credit` no se emite mientras el criterio siga `unset`.
- Con un criterio explícito, la emisión sigue ese criterio y requiere que el evento actual sea su disparador verificable. `payment_only` no admite `account_credit`; `account_credit_or_payment` exige asignación y que no exista un evento previo del tipo opuesto asociado a los mismos documentos. La UI conserva comparación y advierte que parametrizar no sustituye la validación firmada.
- Después de emitir ISLR, el servicio rechaza crear o asignar eventos del beneficiario con fecha igual/anterior a la retención; para corregir el disparador primero se anula y revisa el comprobante.

### `previewWithholding(companyId, { kind: iva|islr, documentIds|settlementEventIds })`
- Solo cálculo, no persiste número. Retorna montos + `ruleVersionId + ruleSnapshot + explanation[]` para revisión contador antes de emitir.

### `issueWithholding(companyId, { kind, lines, clientRequestId })`
- TX única: lock operación → verifica período abierto → `UPDATE document_series SET last_number=last_number+1 ... RETURNING` (`(company_id, branch_id?, kind, period_key YYYYMM o YYYYMM-Q1/Q2)`) → forma `AAAAMMSSSSSSSS` IVA (ISLR formato pendiente G9) → snapshot completo + `rule_version_id` → render PDF/Excel → `sha256` → estado `issued` + audit.
- Fallo ⇒ rollback, número no consumido. `UNIQUE(company_id, certificate_number)`.
- Multi-factura: `iva_withholding_lines` con `taxable_base, vat_amount, retention_rate, retained_amount, explanation`. ISLR añade `concept_id, base_sujeta, porcentaje, sustraendo`, fórmula `max(0, base*%-sustraendo)`.
- Errores: `RETENTION_EXCEEDS_VAT`, `SERIES_NOT_FOUND`, `PERIOD_CLOSED`, `INVALID_STATE_TRANSITION`.
- Plazo entrega `fecha_entrega` parametizable con alertas (pendiente definir valor).

### `voidWithholding(id, { reason })` / `reissueWithholding(id, ...)`
- Anula sin liberar número (motivo obligatorio). Sustituto con `replaces_id`. Estados: `draft→calculated→approved→issued→delivered`, `issued|delivered→voided`.

### `listWithholdings(companyId, { kind?, status?, periodId?, partyId? })` — bandejas pendiente/revisión/emitida/entregada/anulada.

## reporting — libros y resumen

Parámetros comunes: `companyId, fiscalPeriodId, branchId?, format pdf|xlsx|csv`. Generados desde documentos, nunca editados directo. Versionado `generated_reports (kind, version, data_snapshot, sha256, storage_path)`. Regenerar cerrado ⇒ mismo `sha256`.

### `GET /api/companies/[companyId]/reports/purchase-book?periodId=&format=` / `sales-book` / `iva-summary` / `iva-withholdings` / `islr-withholdings` / `conciliation`
- `purchase_book|sales_book`: columnas = plantilla golden master, cortes por clasificación/alícuota. Soporta modo factura y Z.
- `iva_summary`: débitos, créditos, exentas, exportaciones, importaciones, ajustes, excedente anterior, retenciones aplicadas/no aplicadas, cuota. Drill-down: cada total enlaza a documentos.
- `conciliation`: libros ↔ resumen ↔ comprobantes, tolerancia 0 (salvo ADR-014).
- Export Excel vía `exceljs` sobre plantilla original (neutralizar CSV injection `=+-@`), PDF vía HTML→Chromium en worker. Almacena con `sha256`.

## periods — cierre y reapertura

Estados: `open→under_review→closed→reopened→under_review→closed`.

### `sendPeriodToReview(periodId)` / `closePeriod(periodId)` / `requestReopen(periodId, { reason })` / `approveReopen(periodId)`
- `close`: checklist automático (filas pendientes, duplicados, RIF inválidos, NC sin afectado, retenciones conciliadas, libros generados) → congela → `closure_hash` sobre ids+versiones → `closed_by/at`. Bloqueo app + trigger DB.
- `reopen`: solicitud → autorización contador → motivo + responsable. Nueva versión reportes, hash anterior conservado. Correcciones post-cierre como `fiscal_adjustments` en período abierto referenciando original.
- Solo contador cierra/reabre.

### `createPeriod(companyId, { kind, year, month, half? })`
- Registro manual desde `/c/[companyId]/periodos` (formulario visible solo para contador). `kind monthly|biweekly`; `half Q1/Q2` obligatorio si quincenal. Rangos: mensual `[YYYY-MM-01,next-01)`, Q1 `[YYYY-MM-01,YYYY-MM-16)`, Q2 `[YYYY-MM-16,next-01)`.
- Idempotente por `UNIQUE(company_id, kind, range)`: si ya existe retorna `{ ok:true, id, created:false }` sin duplicar. Escribe `audit_events(action:create)` en la misma TX.
- La creación automática al registrar documentos (`resolvePeriod`) se mantiene; el formulario es atajo explícito.
- Errores: `FORBIDDEN` (no contador), `VALIDATION_ERROR` (año/mes/quincena), `NOT_FOUND` (empresa).

## audit y attachments

### `listAuditEvents(companyId, { entity_type?, entity_id?, action?, from?, to? })` — solo lectura (todos los roles con `audit.read` o `reports.read`, auditor solo lectura). `REVOKE UPDATE,DELETE` en DB. La UI `/c/[companyId]/auditoria` expone estos filtros + línea de tiempo por documento de compra (origen lote/fila) y exporta CSV con los mismos filtros.
### `uploadAttachment(companyId, { entityType, entityId, originalName, claimedMime }, bytes)` + `GET /api/companies/[companyId]/archivos/[id]?exp=&sig=&uid=`
- Tipo por magic bytes (PDF/PNG/JPEG/CSV/XLSX), límite `MAX_UPLOAD_MB`, nombre sanitizado, dedup por sha256, driver UploadThing (`storage_key`) o fs. Descarga valida firma HMAC (attachment+empresa+usuario, TTL ≤15 min), permiso y empresa; audita subida/descarga/anulación.

## Health

### `GET /api/health` — no auth. Retorna `{ data: { status, db, boss, storage } }` para healthchecks y alertas jobs/backup.

## Pendientes que condicionan esta API (no implementar hasta ADR)

- G4/FX (ADR-013), G8 redondeo/tolerancia (ADR-014), G9 formato ISLR (ADR-005 ext.), G7 convivencia factura/Z, `withholdings_received` diseño, campos comprobante ISLR Decreto 1.808.

---
Ver también: `README.md`, `ARCHITECTURE.md`, `DOMAIN.md`, `DATABASE.md`, `SECURITY.md`, `TODO.md`, `CHANGELOG.md`.
