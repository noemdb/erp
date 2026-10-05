# CU-07 — Cierre de período 2026-10

**Actor:** Contador  
**Precondición:** CU-01 … CU-06 completados; checklist de cierre sin pendientes.  
**Postcondición:** período `closed` con `closure_hash` reproducible.

## Pasos

1. Ir a **Períodos → 2026-10 → Cerrar**.
2. Ejecutar checklist de cierre:
   - [ ] Compras registradas y conciliadas
   - [ ] Ventas registradas y conciliadas
   - [ ] Retenciones aplicadas
   - [ ] Libros generados y comparados
   - [ ] Diferencias D1–D5 = 0 (o aprobadas)
3. Confirmar cierre. Sistema calcula `closure_hash`.
4. Verificar:
   - Estado período = `closed`.
   - `closure_hash` registrado en audit.
   - Trigger anti-mutación activo: intentar editar una compra cerrada → debe fallar.
5. Reabrir período (`reopened`), editar, volver a cerrar:
   - Verificar que `closure_hash` cambia.
   - Verificar que se registra el motivo de reapertura.
6. Verificar que post-cierre solo permite reapertura o `fiscal_adjustments` (diferida F7).

## Criterios de aceptación

- [ ] Checklist de cierre completo.
- [ ] `closure_hash` calculado y registrado.
- [ ] Estado `closed`; mutación bloqueada.
- [ ] Reapertura registra motivo + usuario.
- [ ] Re-cierre produce `closure_hash` reproducible.
- [ ] Audit log completo del ciclo.

## Desviaciones observadas

| # | Descripción | Severidad | Acción |
|---|-------------|-----------|--------|
| | | | |