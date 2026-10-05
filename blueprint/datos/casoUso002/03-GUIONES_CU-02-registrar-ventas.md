# CU-02 — Registrar ventas manualmente

**Actor:** Administrativo  
**Precondición:** Clientes creados con RIF dual; período abierto.  
**Postcondición:** 3 ventas registradas, con serie correlativa sin huecos.

## Pasos

1. Ir a **Ventas → Nueva**.
2. Ingresar factura `001-0001001` (Supermercados Unidos, C.A.):
   - Fecha: 2026-10-03
   - Base: `20000.00`
   - Alícuota IVA: `0.16`
   - Total: `23200.00`
   - Condición: CREDITO_30
3. Guardar. Verificar:
   - IVA = `3200.00`
   - Serie `001-0001001` correlativa.
4. Repetir con `001-0001002` y `001-0001003`.
5. Intentar emitir comprobante IVA de una venta (preview) — no emitir aún.

## Criterios de aceptación

- [ ] 3 ventas creadas; serie sin huecos.
- [ ] IVA coincide con §05.
- [ ] Preview de comprobante IVA muestra base + IVA + total.
- [ ] Audit log append-only.
- [ ] `document_series` actualizado con `UPDATE … RETURNING`.

## Desviaciones observadas

| # | Descripción | Severidad | Acción |
|---|-------------|-----------|--------|
| | | | |