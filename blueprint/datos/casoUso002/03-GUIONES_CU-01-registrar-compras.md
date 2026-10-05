# CU-01 — Registrar compras manualmente

**Actor:** Administrativo  
**Precondición:** Empresa + período 2026-10 abiertos; proveedores creados con RIF dual.  
**Postcondición:** 3 compras registradas, auditadas, con retención IVA/ISLR calculada.

## Pasos

1. Ir a **Compras → Nueva**.
2. Ingresar factura `001-0000123` (Química del Centro, C.A.):
   - Fecha documento: 2026-10-02
   - RIF: J-30876543-2
   - Base imponible: `10000.00`
   - Alícuota IVA: `0.16`
   - Retención IVA: `0.75`
   - Total: `11600.00`
3. Guardar. Verificar:
   - IVA calculado = `1600.00`
   - Retención IVA = `1200.00`
   - Neto a pagar = `10400.00`
4. Repetir con `002-0000456` (Envases Plásticos, S.A.) y `003-0000789` (Transporte Rápido, C.A. — este con ISLR 5 %).
5. Verificar que cada compra tiene `rule_version_id` + `explanation[]` visible.

## Criterios de aceptación

- [ ] 3 compras creadas sin error.
- [ ] IVA y retenciones coinciden con §05.
- [ ] `explanation[]` muestra regla aplicada (versión + snapshot).
- [ ] Audit log registra: creación, usuario, timestamp, hash de documento.
- [ ] RIF dual: se guarda como J-30876543-2, se muestra formateado.
- [ ] No hay warning de tolerancia (0.01 provisional, Inv.8 meta M5).

## Desviaciones observadas

| # | Descripción | Severidad | Acción |
|---|-------------|-----------|--------|
| | | | |