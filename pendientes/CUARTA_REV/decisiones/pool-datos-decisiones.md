# Pool de datos — Registro de decisiones fiscales (RDF)

> **Uso:** copiar y pegar en `/c/[empresa]/decisiones/nueva` (Paso 1 · Hecho y alternativas).
> **Validaciones del formulario:** título 5–140 caracteres; pregunta y cada opción ≥10 caracteres; impacto numérico texto libre ≤500.
> **Fuente:** casos G1/G2/G4/G8/G9/ISLR de la cuarta revisión. El caso 1 usa cifras reales verificadas de la sim #2 (`retrospectiva-sim2.md`).
> **Después del borrador:** en la ficha se completan decisión, fundamento, ejemplo y resultado esperado; el contador firma (inmutable + `sha256`).

---

## 1. G8 · Redondeo (recomendado para el primer registro real)

* **Tema fiscal:** `G8`
* **Título:** `Redondeo por línea o por total en retención IVA 75 %`
* **Pregunta:** `¿El 75 % de retención de IVA se redondea línea por línea y luego se suma, o se suma exacto y se redondea el total?`
* **Opción A:** `Redondeo por línea con HALF_UP a 2 decimales y luego se suma. Cada línea se cierra en centavos antes de totalizar.`
* **Impacto A:** `1179.12`
* **Opción B:** `Suma exacta de los importes y un solo redondeo HALF_UP del total al final.`
* **Impacto B:** `1179.11`
* **Cobertura:** `IVA`

## 2. G2 · Abono en cuenta

* **Tema fiscal:** `G2`
* **Título:** `Fecha que dispara la retención: pago o abono en cuenta`
* **Pregunta:** `Cuando existen pago y abono en cuenta sobre el mismo documento, ¿qué fecha determina el período y la regla de la retención?`
* **Opción A:** `Lo que ocurra primero: se toma la fecha efectiva del evento más temprano, pago o abono, siempre asignado al documento.`
* **Impacto A:** `Abono 06-09-2025 manda sobre pago 10-09-2025 → período 202509`
* **Opción B:** `Solo la fecha de pago dispara la retención; el abono contable no genera efecto hasta que se paga.`
* **Impacto B:** `Período 202509 igual, pero regla evaluada a fecha de pago`
* **Cobertura:** `IVA`

## 3. G9 · Numeración ISLR

* **Tema fiscal:** `G9`
* **Título:** `Formato y reinicio de la serie de comprobantes ISLR`
* **Pregunta:** `¿La numeración de comprobantes de retención ISLR reinicia cada mes o es consecutiva anual por empresa?`
* **Opción A:** `Serie mensual por empresa con formato ISLR-AAAAMM-######, reinicia el día 1 de cada mes.`
* **Impacto A:** `ISLR-202509-000001`
* **Opción B:** `Serie anual consecutiva por empresa sin reinicio mensual, formato ISLR-AAAA-######.`
* **Impacto B:** `ISLR-2025-000001`
* **Cobertura:** `ISLR`

## 4. G1 · Período

* **Tema fiscal:** `G1`
* **Título:** `Período de IVA mensual o quincenal por empresa`
* **Pregunta:** `¿La empresa declara y entera el IVA en período mensual o en períodos quincenales?`
* **Opción A:** `Período mensual: del día 1 al último día del mes calendario.`
* **Impacto A:** `202509`
* **Opción B:** `Períodos quincenales Q1 del 1 al 15 y Q2 del 16 a fin de mes.`
* **Impacto B:** `202509-Q1 y 202509-Q2`
* **Cobertura:** `IVA`

## 5. ISLR · Base de honorarios

* **Tema fiscal:** `ISLR`
* **Título:** `Base de retención ISLR en honorarios profesionales`
* **Pregunta:** `¿La base de retención ISLR en honorarios incluye el IVA de la factura o solo el monto del servicio?`
* **Opción A:** `Base sin IVA: solo el monto del servicio antes de impuestos.`
* **Impacto A:** `Base 900.00 → retenido según porcentaje`
* **Opción B:** `Base con IVA incluido: el total facturado completo.`
* **Impacto B:** `Base 1044.00 → retenido mayor`
* **Cobertura:** `ISLR`

## 6. G4 · Moneda

* **Tema fiscal:** `G4`
* **Título:** `Tasa de cambio aplicable a facturas en divisas`
* **Pregunta:** `¿Qué tasa oficial BCV y de qué fecha se usa para convertir a bolívares la base de una factura emitida en USD?`
* **Opción A:** `Tasa oficial BCV de la fecha del documento, aplicada a la base antes de calcular el IVA.`
* **Impacto A:** `Base USD 100 × tasa del día`
* **Opción B:** `Tasa oficial BCV de la fecha de pago o abono, con diferencia cambiaria tratada aparte.`
* **Impacto B:** `Base recalculada a fecha de pago`
* **Cobertura:** `Sin cobertura directa`

---

## Paso 2 en ficha (completar antes de enviar a revisión)

| Campo | Ejemplo con el caso 1 |
|---|---|
| Decisión | `Se redondea por línea con HALF_UP a 2 decimales y luego se suma.` |
| Fundamento | `Criterio del contador del 2026-10-06: etapa por línea.` |
| Ejemplo base | `1572.15` |
| Resultado esperado | `1179.12` |
| Firmante | Nombre + cédula del contador |
