# Paquete para el contador — qué necesitamos de ti (F0)

> El sistema está construido y verde (28 tests), pero los **valores fiscales** solo los defines tú. Sin esto no hay go-live. Marca cada punto APROBADO / MODIFICAR / PENDIENTE con fecha.

## Respuestas recibidas el 2026-10-01 (seguimiento pendiente)

- IVA mensual; falta identificar cada empresa piloto y contrastar el calendario SENIAT aplicable.
- Sobre abonos en cuenta, el cliente remite a `blueprint/cuestionarioClient.md`. Ese documento propone considerar el momento fiscal de pago/abono y permitir pagos parciales, pero no identifica qué asiento constituye el abono ni confirma datos/flujo real por documento.
- Se implementó captura estructural G2 para eventos pago/abono y asignaciones; no se emite retención desde los abonos. Falta validar los criterios contables y fiscales antes de activar esos cálculos.
- Política FX parcial informada: moneda base bolívares (Venezuela), USD como moneda de referencia y tasa oficial del BCV. Falta definir fecha/tipo de tasa BCV que se aplica y reconocimiento/tratamiento de diferencias cambiarias.
- Se usan puntos de venta/máquinas fiscales y el cliente indica “por sucursal”. Falta determinar si por sucursal se toman facturas, reportes Z o ambos y cómo evitar duplicidad.
- Redondeo informado: “8 cifras decimales significativas”. Falta confirmar método, etapa (línea/documento/período), precisión monetaria final, tolerancia y ejemplos; no cambiar ADR-014 ni motor todavía.
- Se identifican beneficiarios naturales/jurídicos residentes/no residentes. El cuestionario enumera conceptos ISLR posibles como propuestas, no confirma cuáles se pagan realmente ni aporta casos.
- La plantilla XLSX está en `blueprint/datos/formatos_libro_de_compras_libro_de_ventas_resumen_comprobante_ret_de_islr_comprobante_de_retencion_iva.xlsx`. Falta validarla como golden master. No replicar sus datos identificables en fixtures o documentación; anonimizar primero.
- Para numeración ISLR y permisos, el cliente remite al cuestionario, que solo contiene propuestas generales (respetar numeración y mantener controles/trazabilidad); no aporta formato real ni matriz de responsabilidades.
- `blueprint/cuestionarioClient.md` es un cuestionario de levantamiento con respuestas propuestas, no un formulario completado. No tratar sus propuestas como decisiones aprobadas del cliente.
- `pendientes/PRIMERA_REV/asesoria-fiscal-F0.md` y `dorados-propuestos-F0.json` son insumos de asesoría/candidatos, no dictamen ni golden aprobado. El JSON contiene 17 escenarios; porcentajes expresados como puntos porcentuales no coinciden directamente con la entrada decimal del motor, y `ISLR-09` requiere usar base gravable 900 para obtener 306,00.

La revisión legal preliminar de la Providencia IVA SNAT/2025/000054 (arts. 4, 5 y 13) y del Decreto 1.808 de ISLR (art. 1) señala que el evento de retención es el pago o abono en cuenta, lo que ocurra primero. La matriz enlaza reproducciones consultadas y mantiene las reglas como borrador no firmado.

## 1. Matriz de reglas v1 (`anexos/matriz-reglas-v1.md`)

Revisar y firmar el borrador existente. Por cada regla: fuente legal (providencia/decreto/artículo), vigencia desde–hasta, base, %, mínimo, sustraendo y un ejemplo numérico. Completar exclusiones/supuestos IVA y cada concepto ISLR realmente usado (honorarios, comisiones, alquileres, publicidad, transporte, servicios u otros); no asumir que todos aplican.

## 2. Escenarios dorados (30–50 casos)

Operaciones resueltas **a mano** en el formato de `fixtures/tax-scenarios/IVA-01-compra-gravada.json`: entradas (base, IVA, %) y esperado (retenido). Cubre: compra gravada/exenta, NC parcial y total, retención 75%/100%, ISLR con sustraendo mayor a base×% (= 0), pago parcial, factura con líneas gravadas + exentas. Gate: sin el 100% verde no se cierra F2.

## 3. Muestras reales (para M2/M5)

- 1 mes de CSV del legacy (compras y ventas) + 1 mes de CSV de máquina fiscal (Z).
- Los `.xlsx` de formatos originales (golden master para PDF/Excel fiel).
- Indica qué períodos migrar y desde qué sistema sale cada archivo.

## 4. Decisiones bloqueantes (`anexos/checklist-F0.md`)

Para G2, usar la hoja de una página `anexos/decision-abonos-G2-contador.md`: confirmar el registro contable que acredita el abono, fecha/importe, anticipos y parciales, y sustraendo ISLR. La hoja es un instrumento de levantamiento; no sustituye el cotejo legal ni la firma de la matriz. Completa además `anexos/checklist-F0.md`: IVA mensual por empresa; G4; G7; G8; G9 (secuencia IVA/ISLR con evidencia real); conceptos ISLR, base, UT, mínimos y sustraendo; segregación de funciones; G11/G12; portal fiscal e IGTF si aplican. Ratifica o corrige cada escenario propuesto antes de promoverlo a golden.

## 5. Compromiso

Sesión semanal fija + fecha de entrega de matriz y dorados. Todo cambio normativo futuro sigue `docs/runbooks/actualizacion-reglas.md` (nueva vigencia, sin reescribir historia).
