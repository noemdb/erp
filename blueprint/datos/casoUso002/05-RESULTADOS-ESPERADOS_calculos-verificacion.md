# Cálculos de Verificación — Sesión 2026-10-08

## Compras

| # | Factura | Base | IVA 16% | Total | Ret. IVA 75% | Ret. ISLR 5% | Neto |
|---|---------|------|---------|-------|--------------|--------------|------|
| 1 | 001-0000123 | 10000.00 | 1600.00 | 11600.00 | 1200.00 | 0.00 | 10400.00 |
| 2 | 002-0000456 | 5000.00 | 800.00 | 5800.00 | 600.00 | 0.00 | 5200.00 |
| 3 | 003-0000789 | 2000.00 | 320.00 | 2320.00 | 240.00 | 100.00 | 1980.00 |
| **Total** | | **17000.00** | **2720.00** | **19720.00** | **2040.00** | **100.00** | **17580.00** |

## Ventas

| # | Factura | Base | IVA 16% | Total | Condición |
|---|---------|------|---------|-------|-----------|
| 1 | 001-0001001 | 20000.00 | 3200.00 | 23200.00 | CREDITO_30 |
| 2 | 001-0001002 | 15000.00 | 2400.00 | 17400.00 | CREDITO_30 |
| 3 | 001-0001003 | 8000.00 | 1280.00 | 9280.00 | CONTADO |
| **Total** | | **43000.00** | **6880.00** | **49880.00** | |

## Retenciones recibidas

| # | Comprobante | Tipo | Base | Alícuota | Monto | Factura |
|---|-------------|------|------|----------|-------|---------|
| 1 | 2026100001 | IVA | 20000.00 | 0.16 | 2400.00 | 001-0001001 |
| 2 | 2026100002 | IVA | 15000.00 | 0.16 | 1800.00 | 001-0001002 |
| 3 | 2026100003 | ISLR | 20000.00 | 0.05 | 1000.00 | 001-0001001 |

## Eventos de liquidación

| # | Tipo | Documento | Monto | Fecha |
|---|------|-----------|-------|-------|
| 1 | PAGO | 001-0000123 | 10400.00 | 2026-10-10 |
| 2 | ABONO_CUENTA | 001-0001001 | 10000.00 | 2026-10-12 |

## Resumen IVA del período (informativo — T07 pendiente)

- IVA débito (ventas): 6880.00
- IVA crédito (compras): 2720.00
- Retenciones IVA recibidas: 4200.00
- **IVA a pagar (provisional):** 6880.00 − 2720.00 − 4200.00 = **−40.00** (crédito a favor)
  - ⚠️ Nota: el cálculo definitivo depende de T07 (IVA consume eventos) y T06 (tolerancia única).

## Verificación de series

- Compras: `001-0000123`, `002-0000456`, `003-0000789` (sin huecos).
- Ventas: `001-0001001`, `001-0001002`, `001-0001003` (sin huecos).
- Retenciones: `2026100001`, `2026100002`, `2026100003` (sin huecos).

## Verificación de RIF dual

- J-30876543-2 → formateado J-30876543-2
- J-31012345-6 → formateado J-31012345-6
- J-31234567-8 → formateado J-31234567-8
- J-31456789-0 → formateado J-31456789-0