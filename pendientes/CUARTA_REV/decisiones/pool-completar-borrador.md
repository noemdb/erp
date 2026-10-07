# Pool paso 2 — Completar borrador (ficha de la decisión)

> **Uso:** pegar en la tarjeta **Flujo → Completar borrador** (`/c/[empresa]/decisiones/[id]`), luego **Guardar borrador** y **Enviar a revisión**.
> **Validaciones:** decisión y fundamento ≥10 caracteres; resultado formato `0.00`.
> Corresponde 1:1 con `pool-datos-decisiones.md` (mismo orden, mismos casos).

---

## 1. G8 · Redondeo

* **Decisión:** `Se redondea por línea con HALF_UP a 2 decimales y luego se suma.`
* **Fundamento:** `Criterio del contador del 2026-10-06: etapa por línea; sim #2 dio 1179.12 por línea frente a 1179.11 por total.`
* **Ejemplo · base:** `1572.15`
* **Resultado esperado:** `1179.12`
* **Impacto en sistema:** `ADR-014 · regla IVA-01 75 % · dorado G8-01`

## 2. G2 · Abono en cuenta

* **Decisión:** `Rige lo que ocurra primero: vale la fecha efectiva del evento más temprano, pago o abono, siempre asignado al documento.`
* **Fundamento:** `Providencia SNAT/2025/000054 art. 13 y Decreto 1.808 art. 1: pago o abono en cuenta, lo que ocurra primero.`
* **Ejemplo · base:** `1500.00`
* **Resultado esperado:** `1500.00`
* **Impacto en sistema:** `GAP G2 · settlement_events + asignaciones · dorado ABONO-01`

## 3. G9 · Numeración ISLR

* **Decisión:** `La serie de comprobantes ISLR es mensual por empresa con formato ISLR-AAAAMM-###### y reinicia el día 1.`
* **Fundamento:** `Formato acordado con el contador el 2026-10-06 ante Gaceta pendiente de cotejo; serie independiente por empresa.`
* **Ejemplo · base:** `0.00`
* **Resultado esperado:** `1.00`
* **Impacto en sistema:** `GAP G9 · serie islr_withholding · dorado G9-01`

## 4. G1 · Período

* **Decisión:** `La empresa declara y entera el IVA en período mensual, del día 1 al último día del mes.`
* **Fundamento:** `Información del cliente 2026-10-01: IVA mensual; pendiente validar contra calendario SENIAT por empresa.`
* **Ejemplo · base:** `1.00`
* **Resultado esperado:** `1.00`
* **Impacto en sistema:** `GAP G1 · fiscal_periods monthly · período 202509`

## 5. ISLR · Base de honorarios

* **Decisión:** `La base de retención ISLR en honorarios es el monto del servicio sin incluir el IVA de la factura.`
* **Fundamento:** `Decreto 1.808 art. 9; base gravable 900.00 verificada en el candidato ISLR-09 (306.00).`
* **Ejemplo · base:** `900.00`
* **Resultado esperado:** `306.00`
* **Impacto en sistema:** `ISLR concepto HON · base_gravable · dorado ISLR-09`

## 6. G4 · Moneda

* **Decisión:** `La base de facturas en divisas se convierte con la tasa oficial BCV de la fecha del documento, antes de calcular el IVA.`
* **Fundamento:** `Información del cliente 2026-10-01: moneda base bolívares, referencia USD, tasa oficial BCV; fecha y tipo de tasa por confirmar.`
* **Ejemplo · base:** `100.00`
* **Resultado esperado:** `100.00`
* **Impacto en sistema:** `GAP G4 · currency/fx_rate reservados · ADR-013 bloqueada`

---

## Paso 3 (solo contador, en la misma ficha)

1. **Enviar a revisión** → el contador **Aprueba**.
2. **Firmar** con nombre + cédula/RIF (si quien firma preparó el borrador y hay otro contador, el motivo es obligatorio).
3. **Vincular** la regla que autoriza (pestaña de vínculo, rol `autoriza`).
4. Al **activar la regla**, la decisión pasa a `aplicada` y el comprobante queda trazable: comprobante → regla → decisión.
