# 03 — Lo que debe entregar el cliente/contador (especificación detallada)

> **Estado:** propuesta, no firmada · **Actualizado:** 2026-10-09 (noche, tras B22–B35)
> Cada fila es una **dependencia externa**: sin ella el bloque indicado no puede
> cerrarse ni validarse. Nada se "completa por inferencia". Referencias: pedido F0-01
> (`docs/anexos/pedido-F0-01.md`), `docs/anexos/checklist-F0.md`,
> `docs/anexos/matriz-reglas-v1.md`, `blueprint/requerimiento/01-...` §6 y `02-...` R0.

## Estado a 2026-10-09 (qué cambió desde la mañana)

> Lo construible sin el cliente está **terminado y verificado en Neon real**:
> correlativo ISLR (B2), paquete de cierre + congelar (B3/B5), sección y diagramas
> de Casos de Uso (B6–B21, B25–B30), página Estado fiscal (B23), marca BORRADOR
> fail-closed en PDFs (B31), saneamiento DB (B34: migración 0024 + rol mínimo) y
> tests de gates al día (B35). Suite en DB real: en curso de verificación final.
> **Sigue pendiente del cliente/contador (no hay atajo técnico):**

| # | Pendiente | Estado | Dónde firmarlo / verlo |
|---|---|---|---|
| M-1…M-4 | Muestras del mes piloto | 🔲 0/4 recibidas | Convocatoria con dueños y fechas en `docs/anexos/sesion-piloto-convocatoria.md` |
| Matriz | Reglas v1 + ISLR por concepto | 🔲 borrador sin firma | Hoja firmable `docs/anexos/hoja-firma-G9-ISLR.md` |
| G9 | Serie ISLR (A sin migrar / B) | 🔲 sin decidir | Misma hoja §G9; al firmar A, R-E6 sale de provisional sin código |
| Q14 | TXT/XML en v1 + layouts | 🔲 sin respuesta | Acta de sesión (Sí con specs / No por escrito → v2) |
| G1/G7 | Especiales + fuente ventas | 🔲 sin asociar a piloto | `checklist-F0.md` + `roles-piloto-form.md` |
| G8/G4 | Redondeo y tasa BCV | 🔲 método/etapa/fecha pendientes | F0-01 B-17/B-18 (rigen tolerancia y conversión) |

## M-1 — Mes CSV legacy completo (compras + ventas + pagos)

- **Qué es:** exportación de ≥1 mes calendario completo desde el software legacy,
  con las 3 patas: compras, ventas y pagos/abonos del mismo mes.
- **Formato:** CSV por tipo (o el que use el legacy), con cabecera y 1 fila por
  documento/pago. Vale el formato actual sin retocar: el sistema trae
  `import:autodetect` + perfiles de mapeo.
- **Columnas mínimas esperadas:** Nº factura, Nº control, RIF + razón social,
  fechas (emisión y, si existe, recepción/pago), base, IVA, total; en pagos:
  fecha, importe, documento(s) que cancela, y si hay columna de abono ≠ 0
  (dispara aviso G2, no se ignora en silencio).
- **Aceptación:** parseable por `import:autodetect` (10/10 válido como en T02);
  cubre 01→fin de mes sin huecos evidentes; anonimizable antes de entrar al sistema
  (RIF/razones reales solo en entorno con DB, nunca en fixtures ni docs).
- **Bloquea:** R1 (libros desde datos reales), R5 (mes real = Excel), B4 indirecto
  (los TXT/XML deben cuadrar con este mes).
- **Dueño:** cliente (administrativo + proveedor del legacy). **Límite sugerido:**
  el de F0-01 §E (16-oct).

## M-2 — Reportes Z reales por máquina/sucursal

- **Qué es:** ≥1 reporte Z real por máquina fiscal, del mismo mes que M-1,
  con su rango de facturas (`range_from`/`range_to`) y número de Z.
- **Aceptación:** rango legible y correlativo; saltos documentados (se importan
  con advertencia, no bloquean el lote); sirve para fijar `sales_mode`
  (factura individual vs. Z) por sucursal — G7.
- **Bloquea:** R-O2/R-E2 (Libro de Ventas), decisión G7, R5.
- **Dueño:** cliente.

## M-3 — Libros del contador del mismo mes

- **Qué es:** Libro de Compras, Libro de Ventas y Resumen del contador,
  **del mismo mes que M-1/M-2**, en el formato que use hoy (Excel o el que sea).
- **Para qué:** es el **golden de aceptación**: el sistema debe reproducir
  estos totales (gate M5: diferencia 0 o justificada con firma).
- **Aceptación:** mismo período que M-1/M-2; totales legibles por documento;
  se coteja celda a celda contra lo generado (R5).
- **Bloquea:** R5/aceptación. Sin M-3 no hay "mes real = Excel".
- **Dueño:** contador del cliente.

## M-4 — XLSX sobre la plantilla original

- **Qué es:** los 5 formatos del cliente rellenos con datos del mes piloto, sobre
  `blueprint/datos/formatos_*.xlsx`
  (Libro de Compras, Libro de Ventas, Resumen, comprobante ISLR, comprobante IVA).
- **Aceptación:** abre con `exceljs`; inventario con `golden:inspect` sin `#REF!`
  y sin PII (anonimizado); confirma que las columnas de R-O1/R-O2/R-O3 son
  exactamente estas 5 pestañas (pregunta B-16 del pedido F0-01).
- **Bloquea:** fidelidad PDF/Excel (F5), R-E5/R-E6 (campos del comprobante).
- **Dueño:** contador + cliente.

## Matriz de Reglas v1 firmada

- **Qué es:** la tabla que convierte normativa en parámetros activables:
  por cada regla, condición + porcentaje + base + sustraendo + vigencia +
  fundamento (providencia/decreto/artículo) + ejemplo numérico.
- **Contenido mínimo exigible:**
  1. IVA: 75% ordinario y 100% (casos del art. 5), operaciones excluidas art. 13
     supuestos, momento pago/abono (art. 13), entrega de comprobante (art. 16).
  2. ISLR: **conceptos que la empresa paga** (checklist asesoría §2.2),
     base con/sin IVA (B-3), sustraendo en parciales (B-4), UT aplicable (B-5),
     mínimos PJ (B-6), no residentes (B-8).
  3. Redondeo G8: método + etapa (línea/documento/período) + precisión final,
     tras el "8 cifras significativas" (B-17).
  4. Tasa BCV G4: fecha y tipo de tasa aplicable + tratamiento de diferencias (B-18).
- **Forma de firma:** revisión del borrador (`docs/anexos/matriz-reglas-v1.md`)
  marcada APROBADO/MODIFICAR por fila, con fecha y firmante; cada fila aprobada
  entra como RDF firmado y solo entonces su regla se activa (`GATE_NO_RDF`).
- **Bloquea:** F2 (cierre fiscal), R2-ISLR, R3 (cuota con redondeo válido), R4.
- **Dueño:** contador. **Sin firma no se parametriza nada** (regla de hierro G9/ISLR).

## G9 — Formato y serie de comprobantes ISLR

- **Qué entregar:** (a) el formato de numeración usado hoy (ejemplo anonimizado
  de comprobante ISLR real); (b) decisión A (como IVA `AAAAMMSSSSSSSS`) o
  B (otro, adjuntando ejemplo) — pedido F0-01 B-10; (c) política de
  secuencia/reinicio y ámbito por empresa/sucursal; (d) qué hacer con la
  serie provisional `ISLR-AAAAMM-######` actual al migrar (convivencia).
- **Bloquea:** R-E4 (correlativo ISLR definitivo), R-E6 (comprobante ISLR),
  R-E7/R-O4 (XML mensual).
- **Dueño:** cliente + contador (con ejemplar de Gaceta si aplica).
- **Nota:** la asesoría observa posible discrepancia entre el reinicio mensual
  actual del IVA y su lectura del art. 16 — incluir en la misma decisión (B-9).

## Q14 — ¿TXT/XML del SENIAT en v1? (Sí/No + specs)

- **Qué entregar si es Sí:** (a) confirmación escrita de alcance;
  (b) layout oficial del portal para cada archivo (versión del esquema, campos,
  longitudes, codificación, catálogos de códigos); (c) 1 TXT aceptado + 1 XML
  aceptado de ejemplo (anonimizables) del mes piloto; (d) regla de qué
  operaciones entran en cada archivo (excluidas, exentas, NC/ND).
- **Si es No:** R4 sale del v1 y se archiva como backlog v2 (decisión firmada,
  una frase en `TODO.md`, como el diferimiento G4).
- **Bloquea:** R-O4, R-E7, R-E8 (B4). Sin spec no se escribe ni una línea.
- **Dueño:** cliente (el contador valida el contenido fiscal).

## Fila rápida (todo junto)

| # | Entregable | Dueño | Bloquea | Criterio de listo |
|---|---|---|---|---|
| M-1 | CSV legacy mes completo | Cliente | R1, R5 | `import:autodetect` OK, mes sin huecos |
| M-2 | Z reales por máquina | Cliente | R-O2/R-E2, G7 | rango + saltos documentados |
| M-3 | Libros del contador, mismo mes | Contador | R5/M5 | cotejo 0 o justificado |
| M-4 | XLSX plantilla rellena | Contador | F5, R-E5/R-E6 | `golden:inspect` sin `#REF!`/PII |
| — | Matriz v1 firmada (IVA+ISLR+G8+G4) | Contador | F2, R2-ISLR, R3, R4 | fila APROBADA + RDF |
| G9 | Serie ISLR + muestra | Cliente+contador | R-E4/R-E6/R-E7 | decisión A/B + convivencia |
| Q14 | TXT/XML: Sí/No + layouts + ejemplos | Cliente | R-O4/R-E7/R-E8 | spec + ejemplo aceptado, o No firmado |
| G1/G7 | Quién es especial + fuente ventas/sucursal | Cliente | R-E1…R-E8 | `period_kind` + `sales_mode` por empresa |
