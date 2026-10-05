# CU-05 — Eventos de liquidación G2 (pago + abono a cuenta)

**Actor:** Administrativo  
**Precondición:** CU-01 + CU-02 completados; `companies.abono_criterion` en `unset` (fail-closed).  
**Postcondición:** 2 eventos registrados; IVA aún NO consume eventos (T07 pendiente).

## Pasos

1. Ir a **Pagos → Nuevo**.
2. Registrar pago total de FC-001:
   - Fecha: 2026-10-10
   - RIF: J-30876543-2
   - Documento: `001-0000123`
   - Monto: `10400.00`
   - Medio: TRANSFERENCIA
   - Referencia: REF-2026-1010-001
3. Verificar que el pago se registra como evento `payment` con asignación.
4. Registrar abono a cuenta de FV-001:
   - Fecha: 2026-10-12
   - RIF: J-31012345-6
   - Documento: `001-0001001`
   - Monto: `10000.00`
   - Tipo: `account_credit`
5. Verificar que `abono_criterion` sigue en `unset` → **fail-closed**:
   - El sistema debe **rechazar** o marcar `G2_EVENT_REVIEW_REQUIRED` si intenta consumir el evento para IVA.
6. Contador cambia `abono_criterion` a `payment_first` (solo contador puede).
7. Verificar que el evento `account_credit` queda marcado para revisión.

## Criterios de aceptación

- [ ] Evento `payment` registrado con asignación a FC-001.
- [ ] Evento `account_credit` registrado con asignación a FV-001.
- [ ] `abono_criterion = unset` ⇒ fail-closed (no consume para IVA).
- [ ] Código `G2_EVENT_REVIEW_REQUIRED` emitido cuando aplica.
- [ ] Solo contador cambia `abono_criterion`.
- [ ] Audit log de ambos eventos + cambio de criterio.
- [ ] **IVA no consume eventos** (T07 pendiente) — verificar que el libro de IVA no incluye estos eventos aún.

## Desviaciones observadas

| # | Descripción | Severidad | Acción |
|---|-------------|-----------|--------|
| | | | |