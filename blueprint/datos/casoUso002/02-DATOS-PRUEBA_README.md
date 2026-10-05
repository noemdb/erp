# Datos de Prueba — Sesión 2026-10-08

Todos los datos son **sintéticos** y están marcados como tales.
Empresa: Distribuidora Los Andes, C.A. — RIF J-30123456-7
Período: 2026-10
Moneda: VES (Bs.) — montos string 2 decimales, porcentajes fracción string (E-2)

## Archivos

| Archivo | Contenido | Formato | CU |
|---------|-----------|---------|-----|
| compras-oct-2026.csv | 3 compras | CSV legacy | CU-01, CU-03 |
| ventas-oct-2026.csv | 3 ventas | CSV legacy | CU-02, CU-03 |
| retenciones-recibidas.csv | 3 retenciones de clientes | CSV | CU-04 |
| z-oct-2026.csv | 1 reporte Z | CSV máquina fiscal | CU-03 |
| pagos-abonos.csv | 2 eventos liquidación | CSV | CU-05 |

## Nota sobre montos

- `base_imponible`: base para IVA (string, 2 dec)
- `base_gravable`: base para ISLR (string, 2 dec) — contrato E-2
- `alicuota`: fracción string (`0.16` = 16 %, `0.05` = 5 %)
- `retencion_iva`: 75 % del IVA (agente de retención)
- `retencion_islr`: según concepto (servicios 5 %, bienes 3 %)