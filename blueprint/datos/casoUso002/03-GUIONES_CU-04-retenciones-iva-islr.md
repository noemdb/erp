# CU-04 — Retenciones IVA/ISLR + emisión de comprobantes

**Actor:** Contador (solo él emite)  
**Precondición:** CU-02 completado (ventas emitidas); clientes son agentes de retención.  
**Postcondición:** 3 retenciones recibidas registradas; comprobantes IVA/ISLR emitidos.

## Pasos

1. Ir a **Retenciones → Recibidas → Nueva**.
2. Registrar retención `2026100001` (Supermercados Unidos, C.A.):
   - Factura afectada: `001-0001001`
   - Tipo: IVA
   - Base: `20000.00`
   - Alícuota: `0.16`
   - Monto retenido: `2400.00`
   - Período fiscal: 2026-10
3. Repetir con `2026100002` (Farmacias del Pueblo, IVA) y `2026100003` (Supermercados, ISLR 5 %).
4. Verificar flujo: `registrada → conciliada → aplicada`.
5. Emitir comprobante IVA de retención (Form 03) para `2026100001`:
   - Verificar numeración sin huecos.
   - Verificar `rule_version_id` + `explanation[]`.
6. Emitir comprobante ISLR (Form 05) para `2026100003`.
7. Verificar PDF post-commit (`render:retry` si falla).

## Criterios de aceptación

- [ ] 3 retenciones registradas; estado inicial `registrada`.
- [ ] Conciliación contra factura afectada (match por RIF + nro factura).
- [ ] Aplicación actualiza estado a `aplicada`.
- [ ] Comprobante IVA emitido: numeración sin huecos, snapshot en TX.
- [ ] Comprobante ISLR emitido: idem.
- [ ] PDF generado **fuera de TX** (post-commit); `render:retry` si falla.
- [ ] Audit log: emisión, usuario contador, hash.
- [ ] Solo contador puede emitir (RBAC verificado con usuario adminis → debe fallar).

## Desviaciones observadas

| # | Descripción | Severidad | Acción |
|---|-------------|-----------|--------|
| | | | |