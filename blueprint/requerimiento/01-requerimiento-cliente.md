# 01 — Requerimiento del cliente: reportes al cierre de cada período

> **Estado:** propuesta, no firmada · **Actualizado:** 2026-10-09
> Idioma ubicuo según `docs/DOMAIN.md`. Sinónimo = deuda de vocabulario.

## §0. Texto original recibido (sin editar, solo formato)

> Buenas noches, me parece muy sofisticado, lo que yo necesitaría que me arrojara son
> los reportes siguientes al cerrar cada periodo bien sea quincenal o mensual según corresponda:
>
> **Ordinarios:** 1-Libro de compras con su resumen (mensual 01/01/2026-31/01/2026),
> 2-Libro de ventas con su resumen (mensual), 3-Resumen de declaración de IVA
> (compras con créditos fiscales, ventas con débitos y si me realizaron retenciones, mensual),
> 4-Reporte XML para declaración de retención de ISLR (mensual).
>
> **Especiales:** 1-Libro de compras con su resumen (quincenal 01/01/2026-15/01/2026),
> 2-Libro de ventas con su resumen (quincenal 16/01/2026-31/01/2026),
> 3-Resumen de declaración de IVA (quincenal), 4-Reporte de correlativo de comprobantes
> de retención de IVA y de ISLR por períodos quincenales, 5-Comprobantes de retención de IVA
> (quincenal), 6-Comprobante de retención de ISLR (quincenal), 7-Reporte XML para
> declaración de retención de ISLR (mensual), 8-Reporte TXT para declaración de IVA (quincenal).

Notas de transcripción: "Odinarios" → ordinarios; "ISRL" → ISLR. Donde el cliente escribe
"resumen" junto al libro se interpreta como **totales del propio libro** (no el Resumen de IVA,
que es el reporte Nº 3). Donde escribe "Resumen de declaración de IVA" se interpreta como
**Resumen de IVA** (`DOMAIN.md`: insumo para la declaración, no la declaración).

## §1. Lo que pide, en una frase

Al cerrar cada **período fiscal** (`fiscal_periods`), según el `period_kind` de la empresa
(`monthly` ordinario / `biweekly` especial — G1), el sistema debe arrojar el **paquete de
cierre**: libros + resumen + comprobantes + correlativo + archivos para el SENIAT,
congelados y reproducibles.

## §2. Reglas transversales (valen para los 8 reportes)

1. **Período manda.** Todo reporte filtra por `fiscal_period_id`. La `fecha_fiscal` del
   documento determina a qué período pertenece; la fecha de registro nunca la sustituye.
2. **Rangos exactos.** Mensual `[2026-01-01, 2026-02-01)`. Quincenal Q1 `[2026-01-01, 2026-01-16)`,
   Q2 `[2026-01-16, 2026-02-01)` (ver `docs/API.md` periods). El cliente los nombra
   "01–15 / 16–31": misma partición, corte el día 16.
3. **Derivados, no editables.** Libros, Resumen y correlativo se generan desde los
   documentos; nunca se editan a mano. Corrección = anular/sustituir (`replaces_id`) o
   ajuste con reapertura y motivo auditado.
4. **Congelado + reproducible.** Cada reporte emitido guarda `data_snapshot` + `sha256`
   (`generated_reports` / `report_versions`). Regenerar un período cerrado produce el mismo hash.
5. **Trazabilidad.** Desde cualquier total se baja al documento y a su origen
   (fila CSV + archivo). Anulados se excluyen de totales pero **se listan marcados**.
6. **Dinero exacto.** `numeric(18,2)` y `decimal.js`; jamás `float`. Tolerancia/redondeo
   según ADR-014 (G8, bloqueante).
7. **Aislamiento.** Todo filtra por `company_id` (`withTenant` + RLS). La empresa activa
   viaja en la URL.

## §3. Régimen ordinario — `period_kind = monthly` (4 reportes)

### R-O1. Libro de Compras + totales del libro (mensual)

- **Qué es:** reporte cronológico de las compras del mes (`purchase_documents`:
  factura, NC/ND con documento afectado, importación, exenta/sin derecho a crédito).
- **Período ejemplo:** `2026-01` = `[2026-01-01, 2026-02-01)`.
- **Contenido:** líneas por documento (proveedor/RIF, Nº factura, Nº control,
  `fecha_documento`, `fecha_fiscal`, `base_imponible`, `iva_causado`, total,
  clasificación gravada/exenta) + fila de totales del libro por alícuota/clasificación.
- **Formatos:** pantalla + PDF/Excel sobre plantilla del cliente; CSV de respaldo.
- **Pregunta abierta:** ¿columnas exactas = las 5 pestañas del XLSX en
  `blueprint/datos/formatos_*.xlsx`? (cotejo M-4 pendiente).

### R-O2. Libro de Ventas + totales del libro (mensual)

- **Qué es:** reporte cronológico de las ventas del mes (`sales_documents` o reportes Z,
  según `sales_mode` por empresa/sucursal — G7; no se mezclan ambos en mismo período/sucursal).
- **Período ejemplo:** `2026-01`.
- **Contenido:** análogo a compras (cliente, factura/control o rango Z `range_from/to`,
  base, IVA, total) + totales.
- **Pregunta abierta:** confirmar por sucursal la fuente (factura individual vs. Z) + muestra Z real (M-2).

### R-O3. Resumen de IVA (mensual)

- **Qué es:** consolidación del mes: débitos (ventas), créditos (compras), exentas,
  exportaciones, ajustes, excedente anterior, **retenciones que me realizaron**
  (`withholdings_received`, flujo registrada→conciliada→aplicada, línea informativa
  sin neteo — G3) y cuota del período. Es **insumo** para la declaración, no la declaración.
- **Incluye:** drill-down (cada total enlaza a sus documentos) + conciliación
  libros ↔ resumen ↔ comprobantes.
- **Pregunta abierta:** confirmar tratamiento de excedentes y de NC/ND del mes.

### R-O4. Archivo XML de retenciones de ISLR (mensual)

- **Qué es:** archivo para la declaración de ISLR retenido del mes en el portal SENIAT.
- **Estado:** ⚠️ **Gated por Q14** (`docs/anexos/pedido-F0-01.md` B-14: ¿TXT/XML en v1?).
  Sin el layout oficial SENIAT + muestra aceptada no se puede construir ni validar.
- **Requiere del cliente:** especificación del portal (versión del esquema, campos,
  codificación), 1 XML aceptado de ejemplo (anonimizable) y regla de conceptos/sujetos
  (matriz v1 + G9 numeración ISLR).

## §4. Régimen especial — `period_kind = biweekly` (8 reportes)

Todo lo mensual del §3 aplica por quincena, más comprobantes, correlativo y TXT.
El **XML de ISLR sigue siendo mensual** (§4.7).

### R-E1. Libro de Compras + totales (quincenal: Q1 y Q2)

Igual que R-O1, generado dos veces: Q1 `[2026-01-01, 2026-01-16)` y Q2 `[2026-01-16, 2026-02-01)`.

### R-E2. Libro de Ventas + totales (quincenal: Q1 y Q2)

Igual que R-O2, por Q1 y Q2. El texto del cliente cita "16/01–31/01" como ejemplo de
la segunda quincena; el sistema emite **ambas**.

### R-E3. Resumen de IVA (quincenal: Q1 y Q2)

Igual que R-O3, por quincena. Arrastre de excedente Q1→Q2 a confirmar con el contador.

### R-E4. Correlativo de comprobantes de retención IVA + ISLR (quincenal)

- **Qué es:** listado de los comprobantes **emitidos** en la quincena, en orden de
  `certificate_number`, con estado (`issued/delivered/voided`), beneficiario/RIF,
  `fecha_emision`, base, impuesto y retenido. Anulados incluidos y marcados
  (el número nunca se reutiliza — numeración sin huecos, Inv. 5).
- **Cubre:** IVA (`AAAAMMSSSSSSSS`) e ISLR (formato pendiente G9) en un solo listado
  o en dos secciones; a confirmar con el contador.

### R-E5. Comprobante de retención de IVA (quincenal, por comprobante)

- **Qué es:** documento por cada retención practicada: Nº `AAAAMM`-serie, beneficiario,
  líneas (facturas afectadas con base/IVA/%/retenido), `rule_version_id` + snapshot,
  `fecha_emision`/`fecha_entrega`, PDF con ORIGINAL/COPIA (pregunta F-4 del pedido F0-01).
- **Serie:** `(company_id, kind='iva_withholding', period_key)`; `period_key` quincenal
  `YYYYMM-Q1/Q2` (ver `docs/DATABASE.md`).

### R-E6. Comprobante de retención de ISLR (quincenal, por comprobante)

- **Qué es:** análogo a R-E5 con `concepto_id`, `base_sujeta`, porcentaje, sustraendo
  (`max(0, base×% − sustraendo)`), evento de liquidación origen (pago o abono — G2).
- **Estado:** ⚠️ **Bloqueado por G9** (formato de numeración ISLR sin definir) y por
  matriz ISLR (conceptos, base con/sin IVA, sustraendo parcial, UT — pedido F0-01 B-1…B-8).

### R-E7. Archivo XML de retenciones de ISLR (mensual, aunque la empresa sea quincenal)

Igual que R-O4: un archivo por mes calendario que agrega las dos quincenas. Mismo gate Q14.

### R-E8. Archivo TXT de IVA (quincenal)

- **Qué es:** archivo por quincena para la declaración de IVA del especial en el portal SENIAT.
- **Estado:** ⚠️ **Mismo gate Q14 que el XML.** Requiere layout oficial + TXT aceptado de
  ejemplo + confirmación de qué operaciones entran (excluidas art. 3, exportaciones,
  alícuota 0, NC/ND del período).

## §5. Lo que este requerimiento NO pide (fuera de alcance)

Factura electrónica, portal de proveedores, contabilidad completa, nómina, inventario,
tesorería/CxP (solo eventos pago/abono con asignación — G2/G11), OCR/IA. Sin API
realtime con legacy/Z/SENIAT en v1.

## §6. Respuestas y muestras que faltan del cliente/contador

| # | Qué falta | Dónde está pedido | Bloquea |
|---|---|---|---|
| 1 | `period_kind` por empresa piloto (¿quién es especial?) | G1, `checklist-F0.md` | R-E1…R-E8 |
| 2 | Formato/serie ISLR + muestra anonimizada | G9, pedido F0-01 B-10 | R-E4, R-E6, R-E7/R-O4 |
| 3 | ¿TXT/XML SENIAT en v1? (Sí/No) + layouts + ejemplos aceptados | Q14, pedido F0-01 B-14 | R-O4, R-E7, R-E8 |
| 4 | Conceptos ISLR pagados, base con/sin IVA, sustraendo parcial, UT, mínimos | B-1…B-8 | R-E6, R-E7 |
| 5 | Fuente Libro de Ventas por sucursal + Z real | G7, M-2 | R-O2, R-E2 |
| 6 | Mes CSV legacy + libros del contador del mismo mes (M-1…M-4) | pedido F0-01 §E | aceptación R5 |
| 7 | Columnas exactas libros/resumen (= XLSX 5 pestañas?) | F0-01 B-16, M-4 | R-O1…R-O3, R-E1…R-E3 |
| 8 | Redondeo método/etapa, tasa BCV aplicable | G8/G4, B-17/B-18 | totales y conciliación |
