# Matriz de alcance de render v1 — REP-01

> **Fecha:** 2026-10-04 · **Estado:** verificada en código + completada donde no
> requería decisión fiscal. El Excel sobre plantilla del cliente y la paridad
> visual con el art. 16 quedan a formato aprobado (F0-01/F0-06) — no se adelantan.

## Por documento × formato

| Documento | HTML versionado | PDF archivado post-commit | CSV descarga | Excel sobre plantilla |
|---|---|---|---|---|
| Comprobante IVA | ✅ `iva-certificate/v1` | ✅ `renderIvaPdf` + `render:retry` + botón | — | ⏳ tras formato aprobado |
| Comprobante ISLR | ✅ `islr-certificate/v1` (nuevo) | ✅ `renderIslrPdf` + `render:retry` + acción (nuevo) | — | ⏳ tras formato aprobado |
| Libro de Compras | ✅ `purchase-book/v1` | ⏳ (HTML listo; PDF bajo demanda, sin snapshot archivado) | ✅ route | ⏳ tras formato aprobado |
| Libro de Ventas (factura y Z) | ✅ `sales-book/v1` (nuevo; fila Z conserva identidad) | ⏳ igual que compras | ✅ route | ⏳ tras formato aprobado |
| Resumen IVA | ✅ (sin versión; pendiente `summary/v1`) | ⏳ igual que libros | — | ⏳ tras formato aprobado |

Leyenda: ✅ existe y probado · ⏳ diseñado/fuera de este bloque (motivo abajo) · — no aplica.

## Qué se completó en este bloque

1. `renderIslrCertificateHtml` + `renderIslrPdf` (idempotente, 3 reintentos, adjunto con sha, `render_done` en auditoría) + `renderIslrPdfAction` (mismo permiso de emisión).
2. `renderSalesBookHtml` (columna tipo: `invoice` vs `z_summary`; la fila Z ya trae `Z-<n> [rango]` en documento).
3. `listPendingRenders` unificado IVA+ISLR (con `kind`) y `render:retry` despacha por clase.
4. Tests: `render-islr.test.ts` (pending→done→negado) + determinismo/escape/versionado en `evidence.test.ts`.

## Lo que queda fuera (registrado, no olvidado)

1. **Excel sobre plantilla original:** `exceljs` está (lo usa el comparador) pero no hay generadores. El mapa de celdas por documento se define contra el golden validado (REP-03) con las 5 preguntas de formato ya enviadas (F0-01). Generar sin formato aprobado sería adelantar decisión del cliente.
2. **PDF de libros/resumen:** HTML listo; archivado con snapshot queda para cuando el formato sea aprobado (hoy solo CSV + HTML en tests). Sin snapshot archivado no hay `sha256` que conciliar.
3. **`summary` sin versión de plantilla:** `renderSummaryHtml` no declara versión (los demás sí `…/v1`). Unificar a `summary/v1` cuando se toque ese archivo.
4. **`islr_withholdings` sin columna `pdf_sha256`** (IVA sí la tiene): el sha vive en adjunto + auditoría. Migración aditiva futura si el restore drill la exige; no se migró en este bloque a propósito (cambio de schema en ventana con edición concurrente).
5. **Tablero de pendientes en UI:** `listPendingRenders` solo lo consumen tests y `render:retry`; el reintento manual es por botón en el detalle. Tablero global pendiente (alcance UI, no de este bloque).
6. **Paridad visual art. 16:** las plantillas son estructurales, no réplica del comprobante oficial. La fidelidad se valida contra golden real (REP-03) con el contador.
