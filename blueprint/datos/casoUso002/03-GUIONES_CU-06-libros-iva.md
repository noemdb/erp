# CU-06 — Libro de Compras y Libro de Ventas

**Actor:** Contador  
**Precondición:** CU-01 + CU-02 + CU-03 completados.  
**Postcondición:** 2 libros generados, comparados, con drill-down funcional.

## Pasos

1. Ir a **Reportes → Libro de Compras**.
2. Seleccionar período 2026-10.
3. Generar. Verificar:
   - 3 compras listadas (1 manual + 3 importadas = 4 si se duplicó; verificar dedupe).
   - Base total = `17000.00`
   - IVA total = `2720.00`
   - Retención IVA total = `2040.00`
4. Drill-down en cada fila → ver factura origen + audit.
5. Ir a **Reportes → Libro de Ventas**.
6. Generar. Verificar:
   - 3 ventas listadas.
   - Base total = `43000.00`
   - IVA total = `6880.00`
7. Comparar contra §05 (calculos-verificacion.md).
8. Verificar `sha256` del libro (reproducibilidad).

## Criterios de aceptación

- [ ] Libro de Compras: 3 filas, totales coinciden con §05.
- [ ] Libro de Ventas: 3 filas, totales coinciden con §05.
- [ ] Drill-down funcional (fila → documento origen).
- [ ] `sha256` estable en 2 corridas consecutivas.
- [ ] Comparador 2.A (infra) detecta diferencias si se inyecta un error sintético.
- [ ] Exportable a Excel/PDF (probar en CU-08).

## Desviaciones observadas

| # | Descripción | Severidad | Acción |
|---|-------------|-----------|--------|
| | | | |