# CU-08 — Emisión PDF/Excel

**Actor:** Contador  
**Precondición:** CU-04 + CU-06 completados.  
**Postcondición:** PDFs y Excel generados, firmados, con `pdf_sha256`.

## Pasos

1. Emitir comprobante IVA de retención `2026100001`:
   - Verificar PDF generado.
   - Verificar `pdf_sha256` registrado.
   - Verificar formato (Chrome 154 headless).
2. Emitir comprobante ISLR `2026100003`:
   - Verificar PDF.
   - Verificar `pdf_sha256` (o marcar no-migrar si aplica).
3. Exportar Libro de Compras a Excel:
   - Verificar contra golden (mapa de celdas).
   - Verificar `exceljs` sobre plantilla original.
4. Exportar Libro de Ventas a Excel.
5. Verificar paridad art. 16 (formato legal).
6. Verificar que render ocurre **fuera de TX** (`pending` + `render:retry`).

## Criterios de aceptación

- [ ] PDF comprobante IVA: formato correcto, `pdf_sha256` estable.
- [ ] PDF comprobante ISLR: idem (o no-migrar documentado).
- [ ] Excel Libro Compras: celdas coinciden con golden.
- [ ] Excel Libro Ventas: idem.
- [ ] Paridad art. 16 verificada.
- [ ] Render fuera de TX (verificar `pending` en audit).
- [ ] `render:retry` funciona si se fuerza fallo.

## Desviaciones observadas

| # | Descripción | Severidad | Acción |
|---|-------------|-----------|--------|
| | | | |