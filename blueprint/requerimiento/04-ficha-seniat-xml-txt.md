# 04 — Ficha SENIAT XML/TXT (propuesta documental, sin código)

> **Estado:** propuesta para validar, no es spec oficial · **Actualizado:** 2026-10-09
> Recopilado de fuentes públicas (abajo) para acelerar Q14. **Nada de esto sustituye**
> el layout oficial del portal ni la validación del contador: antes de codificar R4
> se exige Q14=Sí + spec + ejemplo aceptado (ver `03-pendientes-cliente.md`).

## XML de retenciones ISLR (R-O4 / R-E7)

- **Vía:** macro Excel del SENIAT que genera el XML (Forma 99074: sueldos, salarios y otras retenciones).
- **Base:** Providencia Administrativa 0095 (22-09-2009, G.O. 39.269); columna **Fecha de operación** = día del pago o abono en cuenta, debe caer en el período declarado.
- **Contenido por retención (a confirmar):** RIF agente = RIF logueado, RIF retenido, Nº factura/control, fecha, base, concepto (código oficial), %, sustraendo, retenido, firma/sello.
- **Validaciones conocidas del portal:** extensión `.xml`, orden exacto de elementos, etiquetas de apertura/cierre iguales, validación contra esquema, RIF agente = contribuyente logueado, fecha ≤ actual, códigos de concepto de la tabla oficial.
- **UT:** si cambió en el lapso, admite ambos montos.
- **Plazo usual:** primeros días hábiles del mes siguiente (según calendario anual por RIF).
- **Qué pedir en Q14:** manual técnico + esquema XSD vigentes, tabla de códigos de conceptos, 1 XML aceptado de ejemplo y calendario del año.

## TXT de retenciones IVA (R-E8)

- **Vía:** Excel → Guardar como texto delimitado por tabulaciones (Forma 35).
- **Columnas (a confirmar):** RIF, período, tipo/número de documento (01–06), montos, base, retenido.
- **Portal:** modo *prueba de carga* primero (informa columna del error); luego proceso definitivo.
- **⚠️ Irreversible:** una vez procesado satisfactoriamente, el portal **no permite corregir** (ni siquiera RIF de proveedor errado). El sistema debe validar RIF-beneficiario antes de generar.
- **Quincenal especiales:** Providencia SNAT/2020/00057 + calendario anual por último dígito del RIF (dos cortes por mes).
- **Qué pedir en Q14:** plantilla Excel oficial vigente, especificación de columnas y tipos, 1 TXT aceptado de ejemplo y calendario del año.

## Fuentes consultadas (públicas, no oficiales)

- Providencia 0095 / Forma 99074 (macro XML, fecha de operación).
- Guía VenAmCham (reglas de validación del portal).
- Providencia SNAT/2020/00057 (calendario quincenal por dígito RIF).
- Guías de elaboración TXT (tabulaciones, prueba de carga) y advertencia Nayma (irreversibilidad).
- `blueprint/fuentes ERP Tributario Lite.md` (base).
