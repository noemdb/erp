# Hoja Sesión 1 — Tier A (90 min, 2.0.1 WS4)

> Llevar impresa. Cada fila se cierra con RDF o diferimiento. Sin muestras reales, G8/G2 se trabajan con el corpus sintético marcado (no cuentan para S3).

| # | Decisión | Opción A | Opción B | Impacto numérico (mes muestra) | Decisión | RDF |
|---|---|---|---|---|---|---|
| 1 | G8 redondeo | HALF_UP por línea | HALF_EVEN por documento | tabla calibración §G8 | | |
| 2 | G2-a evidencia de abono | Asiento CxP | solo pago | conteo divergencias §G2 | | |
| 3 | G2-b base por porción | proporcional | otra: | | | |
| 4 | G2-c sustraendo | A cada pago | B una vez | ISLR-07 ambas variantes | | |
| 5 | Base ISLR | con IVA | sin IVA | | | |
| 6 | UT aplicable | UT 43 vigente | otra: | | | |
| 7 | Mínimos PJD | tabla oficial | | | | |
| 8 | G9 serie ISLR | formato cliente | provisional actual | | | |
| 9 | G1 período | mensual | quincenal | | | |

## §G8 — Especificación de calibración (para implementar si se aprueba el método)
Correr precisión intermedia (8 sig./sin límite) × etapa (línea/documento) × modo (HALF_UP/HALF_EVEN) = 8 combos (implementado) contra el mes real; comparar totales por documento y período vs legacy; firmar la combinación con 0 diferencias (o explicar por qué el legacy no es referencia). Implementación actual: `round2` HALF_UP por línea provisional.

## §G2 — Especificación de divergencias (para implementar con mes real)
Por factura: fecha/período/monto retenido bajo `payment_only` vs `account_credit_or_payment`; contar divergencias y listarlas. Motor actual ya expone ambas (`previewIslr` dual); falta el reporte agregado sobre datos reales.
