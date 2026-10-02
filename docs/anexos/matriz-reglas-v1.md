# Anexo — Matriz de Reglas v1 (borrador para validación)

> **Estado:** borrador documental, no aprobado ni firmado · **Actualizado:** 2026-10-01 · **Dueño de validación:** contador del cliente.
> Este borrador recoge reglas verificadas en textos normativos consultados, no sustituye el cotejo contra la Gaceta Oficial aplicable ni la aprobación del contador. No activar reglas ni declarar F0/F2 cerradas con este documento sin firma.

| # | Regla | Fuente consultada | Vigencia conocida | Parámetros / condición | Ejemplo / tratamiento | Estado |
|---|---|---|---|---|---|---|
| IVA-AGENTE | Sujetos que actúan como agentes de retención | Providencia Administrativa SNAT/2025/000054, arts. 1–2, G.O. N.º 43.171 (16-07-2025) | Desde 01-08-2025, conforme art. 20 | Sujetos pasivos especiales notificados, con el alcance del art. 1; compradores cuyo objeto principal sea comerciar metales o piedras preciosas según art. 2 | No aplicar automáticamente por una etiqueta genérica de “empresa”; validar condición y notificación del agente | Transcripción preliminar; validar perfil de cada empresa |
| IVA-EXC | Operaciones excluidas de retención | Misma Providencia, art. 3 | Desde 01-08-2025 | El artículo enumera 13 supuestos; deben representarse y probarse individualmente, incluidas las condiciones y verificaciones del Portal Fiscal que correspondan | No retener si se acredita un supuesto legal aplicable | Pendiente de desglosar en reglas y fixtures |
| IVA-01 | Porcentaje ordinario | Misma Providencia, art. 4 | Desde 01-08-2025 | 75% del IVA causado | Si el IVA causado documentado es 16,00, retención = 16,00 × 0,75 = 12,00. El ejemplo no fija la alícuota de IVA | Regla legal transcrita; validar tratamiento de operaciones reales |
| IVA-02 | Retención del 100% | Misma Providencia, art. 5 | Desde 01-08-2025 | Cuando el impuesto no esté discriminado; la factura incumpla requisitos/formalidades; la consulta del Portal Fiscal indique 100% o el proveedor no tenga RIF; y en las operaciones del art. 2. Aplicar la fórmula legal cuando el IVA no esté discriminado | Si el IVA causado determinado es 16,00, retención = 16,00; sin IVA discriminado no inferir el impuesto con una tasa hardcodeada | Regla legal transcrita; falta cubrir excepciones y datos de entrada |
| IVA-MOMENTO | Oportunidad de retener | Misma Providencia, art. 13 | Desde 01-08-2025 | Pago o abono en cuenta, lo que ocurra primero; abono en cuenta incluye importes acreditados por el adquirente en su contabilidad o registros | Capturar fecha, monto y documento del evento que dispara la retención; contemplar pagos/abonos parciales según validación contable | Fundamento legal identificado; contrato y esquema actuales insuficientes |
| IVA-COMP | Comprobante de retención | Misma Providencia, art. 16 | Desde 01-08-2025 | Numeración consecutiva `AAAAMMSSSSSSSS`; entrega a más tardar dentro de los primeros 2 días hábiles del período IVA siguiente; campos mínimos descritos en el artículo | La serie IVA debe ajustarse al artículo, incluyendo el reinicio si supera ocho dígitos | Contrastar con implementación y formato XLSX |
| ISLR-MOMENTO | Oportunidad de retener | Reglamento parcial de retenciones ISLR, Decreto N.º 1.808, art. 1, G.O. N.º 36.203 (12-05-1997) | Según texto consultado; cotejar reformas y reglas vigentes antes de activar | Pago o abono en cuenta, lo que ocurra primero | `fecha_pago` por sí sola no basta cuando el abono contable ocurre antes | Fundamento identificado; revisar vigencia/consolidación y modelar evento |
| ISLR-CONCEPTO | Tasas, base, sustraendo y sujeto | Decreto N.º 1.808, especialmente arts. 9 y 24, más normativa vigente aplicable | Pendiente de cotejo normativo actualizado y datos del cliente | Depende del concepto, residencia y tipo de beneficiario; el usuario confirma personas naturales/jurídicas residentes/no residentes, pero no conceptos pagados | No cargar porcentajes de tablas secundarias ni un único porcentaje genérico | Bloqueante: listar conceptos, validar beneficiarios y revisar tabla oficial vigente |

## Respuestas y precisiones del cliente recibidas (2026-10-01)

- Período de IVA informado: mensual. Falta asociar la respuesta a cada empresa piloto y validarla contra su condición/calendario SENIAT.
- Sobre abonos en cuenta, el cliente remite a `blueprint/cuestionarioClient.md`. El cuestionario propone considerar pago o abono cuando corresponda y permitir pagos parciales; no identifica el asiento/evento real, fecha, importe ni asignación por documento.
- Política FX parcial informada: moneda base bolívares (Venezuela), USD como moneda de referencia y tipo de cambio oficial del BCV. Falta definir fecha/tipo de tasa BCV que se aplica y tratamiento contable/fiscal de las diferencias cambiarias.
- Se usan puntos de venta/máquinas fiscales y el cliente indica “por sucursal”. Aún falta establecer si el Libro de Ventas se alimenta por Z, facturas o ambos y la regla antiduplicidad por sucursal/período.
- El cliente precisa “8 cifras decimales significativas” para redondeo. Se requiere confirmar método, etapa y precisión monetaria final antes de modificar ADR-014 o el motor.
- Para ISLR, numeración y permisos, el cuestionario enumera conceptos y controles propuestos, pero no confirma conceptos efectivamente pagados, formato de serie ni matriz de responsabilidades.
- Está disponible una plantilla XLSX en `blueprint/datos/formatos_libro_de_compras_libro_de_ventas_resumen_comprobante_ret_de_islr_comprobante_de_retencion_iva.xlsx`. Sus cinco pestañas corresponden a Libro de Compras, Libro de Ventas, Resumen, comprobante de retención ISLR y comprobante de retención IVA. Falta cotejar campos, fórmulas y uso real con el contador.

La plantilla contiene datos identificables. No copiar esos datos a fixtures, documentación, logs ni repositorios de pruebas; anonimizar antes de usarla como golden master.

`blueprint/cuestionarioClient.md` es un cuestionario con criterios propuestos, no una respuesta completada o aprobada. Sus ejemplos generales no validan por sí solos obligaciones, operaciones ni parámetros específicos del cliente.

## Revisión de asesoría técnico-fiscal y candidatos (2026-10-01)

`pendientes/PRIMERA_REV/asesoria-fiscal-F0.md` identifica temas que deben llevarse a validación, no valores listos para activar:

- **G2:** la captura de eventos pago/abono y asignación está implementada estructuralmente. La operación ISLR sigue ADR-021: con `unset`, solo se emite pago asignado si la comparación dual converge; con `account_credit_or_payment` explícito puede emitirse un abono asignado sujeto a las validaciones. No se infiere que la fecha de factura o importación sea fecha de abono. IVA aún no consume eventos. Deben aprobarse causación/caja, campo-fecha del legacy, abonos anticipados/parciales, atribución de base por porción y sustraendo.
- **ISLR:** porcentajes, códigos, UT 43, sustraendos, mínimos, base con/sin IVA y no residentes son parámetros candidatos de fuentes secundarias/transcripciones. No cargar ni activar hasta cotejo en Gaceta/Portal Fiscal y aprobación contador. El sustraendo por pago vs. por factura queda expresamente abierto.
- **G9:** validar en fuente primaria la secuencia IVA y el reinicio mensual frente a reinicio por desbordamiento; código actual genera `AAAAMM` mensual. ISLR no tiene formato de serie confirmado en evidencia del cliente. Sin migrar series ni emitir formatos nuevos antes de aprobación.
- **Segregación:** el esquema cuatro-ojos, excepción de autoaprobación y tratamiento de anulaciones ya enteradas son propuestas; falta decisión de la empresa. Actualmente el rol contador emite; no añadir estados de aprobación hasta validación.
- **Archivos:** XLSX sigue como referencia, no golden aprobado; falta confrontarlo con requisitos normativos y con libros/comprobantes anonimizados reales del mismo mes.
- **Escenarios propuestos:** 17 registros en `pendientes/PRIMERA_REV/dorados-propuestos-F0.json`, todos `PROPUESTO_NO_VALIDADO` o `PENDIENTE_CRITERIO`. No moverlos a `fixtures/tax-scenarios` (el runner los trata como dorados). Sus tasas están en puntos porcentuales enteros mientras el motor usa fracciones decimales; ISLR-09 calcula 306,00 con base gravable 900, no con base 1.000. Corregir contrato/unidades y validar numéricamente cada caso antes de firmar.

Hallazgos adicionales para backlog/validación: confirmar obligación y alcance de exportación al Portal Fiscal (H2), IGTF en pagos/divisas (H4), calendario de días hábiles (H5), relación anual ISLR (H6) y comprobantes de facturación digital (H7). No expandir v1 ni alterar libros con esos temas hasta decisión de alcance.

## Fuentes consultadas

- [Providencia SNAT/2025/000054, reproducción PDF de la G.O. N.º 43.171](https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/2025/providencia-000054-ret.-iva.-g.o.-43.171-16-07-2025.pdf). La publicación consultada indica fecha 16-07-2025; el art. 20 dispone entrada en vigencia el primer día del primer mes calendario posterior.
- [Decreto N.º 1.808, reproducción del texto de G.O. N.º 36.203](https://www.mmasociados.net/Normativas/ISLR/DECRETO/decreto_N1808.pdf). Usado para localizar los arts. 1, 9 y 24; antes de parametrizar tasas se requiere cotejo de vigencia, reformas y normas posteriores.

El 75% es un parámetro versionado, no una constante. Toda modificación normativa requiere nueva vigencia, fixtures aprobados y preservación de los snapshots históricos.
