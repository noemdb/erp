# Paquete Sesión 1 — 7 RDF + G4, listo para firmar

> **Uso:** el preparador carga cada caso en `/c/[empresa]/decisiones/nueva` (paso 1)
> y en la ficha (paso 2) ANTES de la sesión; el contador en sesión solo
> revisa → aprueba o devuelve → firma → vincula (paso 3, `ruta-firma-rdf.md`).
> **Regla inviolable:** nada aquí está firmado ni acordado. Todo `Decisión propuesta`
> es propuesta del preparador; el contador puede elegir A, B o devolver con motivo.
> Corrige el pool CUARTA_REV donde decía "acordado/verificada" sin firma.
> Prerequisito: Q-09 ejecutado donde haya DB (ensayo con caso descartable).

---

## Orden y tiempos (60–90 min)

| # | Caso | Min | Por qué en este orden |
|---|---|---|---|
| 1 | G8 redondeo | 15 | Cifra exacta en mano (1.179,12 vs 1.179,11); desbloquea T06 |
| 2 | G2 abono | 15 | Cifra sim (abono 06-09 vs pago 10-09); desbloquea T07 |
| 3 | ADR-033 NC | 10 | Cifra sim (NC 001-00004 sumando); desbloquea T07 |
| 4 | G9 serie ISLR | 10 | Sin cifra; formato mensual vs anual |
| 5 | G1 período | 5 | Info cliente mensual; validar por empresa |
| 6 | ISLR base | 10 | ISLR-09 (900 → 306,00) pendiente de verificar |
| 7 | G4 (NO es RDF) | 5 | Una frase: diferir (A) o incluir (B). Ver §7 |

## 1. G8 · Redondeo IVA 75 % (cobertura: IVA)

- **Título:** `Redondeo por línea o por total en retención IVA 75 %`
- **Pregunta:** `¿El 75 % de retención de IVA se redondea línea por línea y luego se suma, o se suma exacto y se redondea el total?`
- **Opción A:** `Redondeo por línea con HALF_UP a 2 decimales y luego se suma. Cada línea se cierra en centavos antes de totalizar.` / Impacto: `1179.12`
- **Opción B:** `Suma exacta de los importes y un solo redondeo HALF_UP del total al final.` / Impacto: `1179.11`
- **Decisión propuesta:** `Se redondea por línea con HALF_UP a 2 decimales y luego se suma.`
- **Fundamento (propuesta, sin firma):** `Cifra sim #2 lote 9740a7bd: 75 % × 1.572,15 = 1.179,12 por línea frente a 1.179,11 por total. Referencia: ADR-014 bloqueada por G8.`
- **Ejemplo base:** `1572.15` / **Resultado esperado:** `1179.12`
- **Impacto en sistema:** `ADR-014 · regla IVA 75 % · dorado G8-01`

## 2. G2 · Abono en cuenta (cobertura: IVA)

- **Título:** `Fecha que dispara la retención: pago o abono en cuenta`
- **Pregunta:** `Cuando existen pago y abono en cuenta sobre el mismo documento, ¿qué fecha determina el período y la regla de la retención?`
- **Opción A:** `Lo que ocurra primero: se toma la fecha efectiva del evento más temprano, pago o abono, siempre asignado al documento.` / Impacto: `Abono 06-09-2025 manda sobre pago 10-09-2025 → período 202509`
- **Opción B:** `Solo la fecha de pago dispara la retención; el abono contable no genera efecto hasta que se paga.` / Impacto: `Período 202509 igual, pero regla evaluada a fecha de pago`
- **Decisión propuesta:** `Rige lo que ocurra primero: vale la fecha efectiva del evento más temprano, pago o abono, siempre asignado al documento.`
- **Fundamento (propuesta, sin firma):** `Referencia normativa a verificar en sesión: Providencia SNAT/2025/000054 art. 13 y Decreto 1.808 art. 1 (pago o abono en cuenta, lo que ocurra primero). Caso sim: abono 1.500 del 06-09 asignado a 004-00099.`
- **Ejemplo base:** `1500.00` / **Resultado esperado:** `1500.00`
- **Impacto en sistema:** `GAP G2 · settlement_events + asignaciones · dorado ABONO-01`

## 3. ADR-033 · Signo de NC en agregados (cobertura: IVA)

- **Título:** `La nota de crédito resta en libro, resumen y conciliación`
- **Pregunta:** `¿La nota de crédito resta base/IVA/total en libro de compras, resumen y conciliación, y queda excluida de documentos elegibles para retención?`
- **Opción A:** `Sí: NC resta, ND suma; elegibles solo facturas con IVA>0.` / Impacto: `Base 10.000/IVA 1.588,15 pasan a restar 100/16 de la NC 001-00004`
- **Opción B:** `No: se mantiene la suma actual y la NC sigue visible como elegible.` / Impacto: `Totales sin cambio; cierre con NC sumando`
- **Decisión propuesta:** `NC resta y ND suma en getPurchaseBook/getIvaSummary/getConciliation; listEligiblePurchases excluye NC/ND. Migración aditiva voided_at/void_reason/replaces_id.`
- **Fundamento (propuesta, sin firma):** `Caso sim: NC 001-00004 (crédito, afectada 001-00001) suma +100/+16 en agregados y aparece como elegible. Referencia: ADR-033 propuesta 2026-10-05.`
- **Ejemplo base:** `100.00` / **Resultado esperado:** `-100.00`
- **Impacto en sistema:** `ADR-033 · agregados + elegibles + migración aditiva · dorados libro/resumen`

## 4. G9 · Serie ISLR (cobertura: ISLR)

- **Título:** `Formato y reinicio de la serie de comprobantes ISLR`
- **Pregunta:** `¿La numeración de comprobantes de retención ISLR reinicia cada mes o es consecutiva anual por empresa?`
- **Opción A:** `Serie mensual por empresa con formato ISLR-AAAAMM-######, reinicia el día 1 de cada mes.` / Impacto: `ISLR-202509-000001`
- **Opción B:** `Serie anual consecutiva por empresa sin reinicio mensual, formato ISLR-AAAA-######.` / Impacto: `ISLR-2025-000001`
- **Decisión propuesta:** `Serie mensual por empresa ISLR-AAAAMM-###### con reinicio el día 1.`
- **Fundamento (propuesta, sin firma):** `Formato provisional del sistema; sin muestra real de comprobante ISLR del cliente. Pedir comprobante real en sesión.`
- **Ejemplo base:** `0.00` / **Resultado esperado:** `1.00`
- **Impacto en sistema:** `GAP G9 · serie islr_withholding · dorado G9-01`

## 5. G1 · Período IVA (cobertura: IVA)

- **Título:** `Período de IVA mensual o quincenal por empresa`
- **Pregunta:** `¿La empresa declara y entera el IVA en período mensual o en períodos quincenales?`
- **Opción A:** `Período mensual: del día 1 al último día del mes calendario.` / Impacto: `202509`
- **Opción B:** `Períodos quincenales Q1 del 1 al 15 y Q2 del 16 a fin de mes.` / Impacto: `202509-Q1 y 202509-Q2`
- **Decisión propuesta:** `Período mensual del día 1 al último día del mes.`
- **Fundamento (propuesta, sin firma):** `Información del cliente 2026-10-01 (IVA mensual); validar contra calendario SENIAT por empresa en sesión.`
- **Ejemplo base:** `1.00` / **Resultado esperado:** `1.00`
- **Impacto en sistema:** `GAP G1 · fiscal_periods monthly · período 202509`

## 6. ISLR · Base de honorarios (cobertura: ISLR)

- **Título:** `Base de retención ISLR en honorarios profesionales`
- **Pregunta:** `¿La base de retención ISLR en honorarios incluye el IVA de la factura o solo el monto del servicio?`
- **Opción A:** `Base sin IVA: solo el monto del servicio.` / Impacto: `Base 900.00 → retenido según porcentaje`
- **Opción B:** `Base con IVA incluido: el total facturado completo.` / Impacto: `Base 1044.00 → retenido mayor`
- **Decisión propuesta:** `Base sin IVA: el monto del servicio (base_gravable).`
- **Fundamento (propuesta, sin firma):** `Referencia a verificar en sesión: Decreto 1.808 art. 9. Candidato ISLR-09: 34 % sobre 900 = 306.00, corregido pero sin verificar con el contador.`
- **Ejemplo base:** `900.00` / **Resultado esperado:** `306.00`
- **Impacto en sistema:** `ISLR concepto HON · base_gravable · dorado ISLR-09`

## 7. G4 · Moneda — NO es RDF, es una frase firmada

Escribir en `docs/TODO.md` (bloqueos) y nota bajo ADR-013 en `docs/DECISIONS.md`:

- **Opción A (recomendada):** `G4 diferido formalmente en v1 el 2026-__-__ por ___. v1 opera en VES; FX se abre en v2 con ADR-013. Sin facturas en divisa en el mes de muestra (lote 9740a7bd, 10 docs).`
- **Opción B:** entra al camino crítico como proyecto (tasa BCV fecha/tipo + diferencias + 5 dorados + UAT en divisa, 3–5 días + 3 sesiones).

---

## Checklist de la sesión (llevar impreso)

- [ ] Q-09 ensayado (ruta sin fallos con caso descartable)
- [ ] 7 borradores cargados (pasos 1+2 de este paquete) + G4 en papel
- [ ] T01: canal/acuse F0-01 anotado; T02: reclamo M-1…M-4 (vence 16-oct)
- [ ] Bloques 7 (ventas/NC/ND/Z) y 9 (libros+Excel+conciliación) ejecutados con fichas ID+SHA-256
- [ ] Por caso: APROBADO/MODIFICAR/PENDIENTE + fecha + firmante + regla vinculada
- [ ] Post-sesión: T04 matriz por workflow → T05 dorados → gate verde

## Después de firmar (Fase 2)

`T04 matriz (06-nov) → T05 30 dorados → T06 (g8:calibrate) + T07 (G2+ADR-033) → T08/T09 → T10 mes real M5 → T11 UAT/acta/go-live`. Cada flecha con aceptación en `taskIN/CONSOLIDADO-TASK.md`.
