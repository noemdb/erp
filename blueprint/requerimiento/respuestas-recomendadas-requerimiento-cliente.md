# Respuestas recomendadas — §6 del requerimiento del cliente (reportes al cierre de período)

> **Estado:** propuesta para revisión · **Fecha:** 2026-10-09 · **Autor:** asesoría técnico-fiscal (apoyo al diseño; **no sustituye** la opinión firmada del contador público colegiado)
> **Responde a:** `01-requerimiento-cliente-reportes-cierre.md` §6 (ocho puntos pendientes).
> **Marcas:** ✅ verificado en texto o fuente consultada · 🟡 práctica generalizada o criterio profesional: el contador debe confirmarlo · ❓ decisión del cliente.

---

## 0. Resumen ejecutivo

| # | Pregunta | Respuesta recomendada (una línea) | Certeza | Firma |
|---|---|---|---|---|
| 1 | ¿Quién es especial (`period_kind`)? | No lo decide el sistema ni el cliente: lo fija el **SENIAT** mediante acto notificado, y **puede revocarlo de oficio** (hay casos en 2026). Modelarlo con **vigencia**, no como columna fija. Piloto 1 = una empresa **especial** si existe; piloto 2 = una ordinaria. | ✅ / ❓ | Contador |
| 2 | Formato/serie ISLR | El Decreto 1.808 (art. 24) **no fija formato de numeración**; el XML de ISLR **no lleva** número de comprobante. Serie independiente, consecutiva por RIF del agente, `AAAAMM`+8 dígitos, sembrada con el último número real del cliente. | ✅ / 🟡 | Cliente + contador |
| 3 | ¿TXT/XML en v1? | **Sí**, ambos, como **generadores de archivo** (no envío). Layouts conocidos abajo; se validan con un archivo aceptado por el portal antes del go-live. | ✅ / 🟡 | Dueño + cliente |
| 4 | Parámetros ISLR | Conceptos = los que aparezcan en el mes real; base **sin IVA** (parámetro); sustraendo **por cada pago/abono**; UT vigente a la fecha de la retención (hoy 43,00); PJD **sin mínimo**. | 🟡 | Contador |
| 5 | Libro de ventas por sucursal | Sucursal con máquina fiscal → desde **Reporte Z diario**; sin máquina → factura individual. Permitir facturas de contingencia dentro de una sucursal Z con **control de solape de rangos**, no bloqueo total. | ✅ / 🟡 | Cliente + contador |
| 6 | Mes real (M-1…M-4) | Un mes **ya declarado y sin sustitutivas**, con casos variados (lista abajo), más la planilla de declaración y los archivos enviados al portal como oráculo. | — | Cliente |
| 7 | Columnas de libros/resumen | El mínimo legal está en el Reglamento de la Ley del IVA (arts. 70–78; resumen **debe coincidir con la declaración**, art. 72). El XLSX de 5 formatos sirve si cumple la lista de §7. Generador **dirigido por mapa de columnas**. | ✅ / 🟡 | Contador |
| 8 | Redondeo y tasa BCV | Precisión intermedia de 8 decimales; redondeo final HALF_UP a 2 decimales **por documento y alícuota**; totales = suma de lo impreso. Tasa: la **impresa en la factura** (obligatoria desde 2020); **no** usar "moneda de mayor valor". Redondeo se confirma por **calibración empírica**. | 🟡 | Contador |

**Cuatro hallazgos que cambian el requerimiento** (detalle en §9): (1) el estatus de especial puede cambiar a mitad de año; (2) la numeración del comprobante de IVA **no incluye la quincena** (el requerimiento y `DATABASE.md` hablan de `YYYYMM-Q1/Q2`); (3) la regla de convivencia Z + factura debe ser **solape de rangos**, no bloqueo; (4) el XML de ISLR espera **porcentajes en puntos (0–100)**, no fracciones.

---

## 1. `period_kind` por empresa piloto — ¿quién es especial?

### Respuesta
La condición de **Sujeto Pasivo Especial (SPE)** la determina el SENIAT mediante un **acto administrativo de efectos particulares debidamente notificado** (✅ boletín de Forvis Mazars 03-2026, 8-jul-2026). Consecuencias verificadas:

| Régimen | IVA | Retención de IVA | Calendario |
|---|---|---|---|
| **Ordinario** | Declaración mensual (✅) | No es agente de retención de IVA | Lapsos ordinarios |
| **Especial (SPE)** | **Quincenal** (✅ varias fuentes) | **Agente de retención de IVA** (✅ Providencia SNAT/2025/000054, arts. 1–2) | Calendario publicado por el SENIAT (por dígito terminal del RIF) |

### Hallazgo: puede cambiar durante el año
El SENIAT ha **revocado de oficio** la calificación a algunos contribuyentes en 2026 (notificándolos incluso por correo). Al perderla: el IVA pasa a mensual, **deja de ser agente de retención de IVA**, cambia el calendario y se suspende el régimen de anticipos de ISLR (✅ Mazars 03-2026). Los umbrales de calificación se expresan desde 2023 en función del tipo de cambio oficial de la moneda de mayor valor (en la práctica, el euro).

### Qué hacer en el sistema
- Hoy `period_kind` y `agente_retencion_iva` son atributos de la empresa y `updateFiscalProfile` **bloquea** el cambio si hay períodos cerrados (ADR/guard de `period_kind`). Ese guard **impide reflejar un cambio de régimen legítimo**.
- **Propuesta:** `company_fiscal_status(company_id, regimen, period_kind, agente_retencion_iva, effective_range daterange, source_document, notified_at)` con `EXCLUDE` de no solapamiento. Cada `fiscal_period` guarda el `period_kind` con el que se creó; los períodos ya cerrados **no se tocan**. El cambio exige: documento de soporte (acto notificado), fecha de efecto confirmada por el contador y creación del primer período bajo el nuevo régimen.
- Avisos operativos: al detectar cambio de régimen, bloquear la emisión de comprobantes de IVA si `agente_retencion_iva = false` desde la fecha de efecto.

### Qué pedir al cliente (por empresa)
1. ¿Es SPE? Aportar el **acto de calificación/notificación** y su fecha; si fue revocada, el acto de revocación.
2. Último dígito del RIF (calendario).
3. ¿Hubo cambios de régimen en los últimos 24 meses?

### Selección del piloto (❓ decisión del cliente, recomendación)
- **Piloto 1: una empresa SPE** (si existe). Es la que ejercita los 8 reportes del requerimiento (comprobantes de IVA, correlativo, TXT) y el mayor riesgo del producto: las retenciones.
- **Piloto 2: una ordinaria** (4 reportes), tras estabilizar la primera.
- Si solo hay ordinarias: pilotear ordinaria y validar R-E1…R-E8 con datos sintéticos marcados hasta tener una especial.

---

## 2. Formato y serie del comprobante de retención de ISLR

### Lo verificado
- ✅ Decreto 1.808, art. 24: el agente debe entregar **un comprobante por cada retención**, con el monto pagado o abonado en cuenta y la cantidad retenida "entre otra información"; en la última retención del ejercicio debe indicar los totales (insumo del ARCV del beneficiario). El texto consultado **no prescribe formato de numeración**.
- ✅ Por contraste, el comprobante de **IVA** sí tiene numeración legal: 14 caracteres `AAAAMMSSSSSSSS`, consecutiva, reinicio solo al desbordar (Providencia 0054, art. 16).
- 🟡 El **XML de ISLR** (ver §3) lleva por detalle solo RIF retenido, N.º de factura, N.º de control, código de concepto, monto de la operación y porcentaje: **no incluye N.º de comprobante**. La numeración ISLR es, por tanto, un control documental interno.

### Recomendación
| Elemento | Propuesta |
|---|---|
| Serie | Independiente de la de IVA; **una por RIF del agente** (la sucursal es solo informativa) |
| Formato | `AAAAMM` (mes de emisión) + 8 dígitos = 14 caracteres, igual que IVA, para homogeneidad |
| Reinicio | `reset_policy = on_overflow` (nunca mensual) salvo que la práctica del cliente sea otra |
| Siembra | Último número real emitido por el cliente (evita duplicados con lo histórico) |
| Contenido mínimo | Agente y beneficiario (razón social, RIF), fecha de emisión, fecha de pago/abono, N.º de factura y de control, concepto y código, base, porcentaje, sustraendo, monto pagado/abonado, monto retenido, período; en la última retención del ejercicio, totales acumulados |

### Qué pedir al cliente
Un comprobante ISLR real (anonimizado) con su número; cómo reinicia hoy la secuencia; si hay una por sucursal; y el último número emitido.

**Si no responde:** operar con la propuesta; la serie es configurable (`reset_policy`, formato) y no bloquea el resto.

---

## 3. ¿TXT/XML para el SENIAT en v1? — Sí

### Por qué sí
1. El **cliente lo pidió explícitamente** (R-O4, R-E7, R-E8).
2. Todo software de retenciones en Venezuela ofrece estos dos archivos; son la salida estándar.
3. Es **generación de archivo**, no integración en tiempo real con el SENIAT (sigue fuera de v1).
4. Esfuerzo acotado (≈ 3 días cada uno + validación), con un riesgo real: **deriva de layout**. Se mitiga con una muestra aceptada y con la prueba de carga del portal.

### Layout TXT de retenciones de IVA (agente de retención)
✅ Guía de elaboración publicada por profesionales; archivo **de texto delimitado por tabulaciones**, 16 columnas A–P:

| Col. | Campo | Observación |
|---|---|---|
| A | RIF del agente de retención | Sin guiones (🟡) |
| B | Período impositivo | `AAAAMM` |
| C | Fecha de factura | Formato exacto por confirmar con muestra |
| D | Tipo de operación | `C` compra / `V` venta |
| E | Tipo de documento | `01` factura · `02` nota de débito · `03` nota de crédito |
| F | RIF del proveedor | |
| G | Número del documento | |
| H | Número de control | |
| I | Monto total del documento | |
| J | Base imponible | |
| K | Monto del IVA retenido | |
| L | Número del documento afectado | Para NC/ND |
| M | Número del comprobante de retención | Los 14 caracteres |
| N | Monto exento | |
| O | Alícuota | |
| P | Número de expediente | Normalmente `0` (🟡) |

El portal ofrece una **opción de prueba de carga** del archivo, con listado de errores; hay un modelo de archivo para el caso "sin operaciones sujetas a retención".

### Layout XML de retenciones de ISLR
🟡 Reconstruido de una rutina publicada de generación del XML y de la práctica de proveedores de software; **debe validarse con la especificación vigente del portal**:

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<RelacionRetencionesISLR RifAgente="J123456789" Periodo="AAAAMM">
  <DetalleRetencion>
    <RifRetenido>V123456789</RifRetenido>
    <NumeroFactura>0001001</NumeroFactura>        <!-- ≤ 10 caracteres -->
    <NumeroControl>12345601</NumeroControl>       <!-- ≤ 8 caracteres, numérico -->
    <CodigoConcepto>053</CodigoConcepto>          <!-- 3 dígitos -->
    <MontoOperacion>10000.00</MontoOperacion>     <!-- punto decimal -->
    <PorcentajeRetencion>1.00</PorcentajeRetencion> <!-- PUNTOS 0–100 -->
  </DetalleRetencion>
</RelacionRetencionesISLR>
```

### Reglas de borde que el exportador debe cumplir (hallazgos)
| Regla | Consecuencia en el sistema |
|---|---|
| **Porcentaje en puntos (0–100)** | El motor guarda **fracciones** (`0.03`); la conversión (×100) ocurre **solo en el borde del exportador** y con test |
| RIF de 10 caracteres sin guiones (letra + 9 dígitos) | Normalizar: `J-30000001-1` → `J300000011`; validar longitud |
| N.º de control ≤ 8, numérico | `00-123401` no cabe: **quitar no dígitos** y validar; si excede, rechazar con mensaje claro |
| N.º de factura ≤ 10 | Validar y avisar |
| Período `AAAAMM`; XML **mensual** | Para empresas quincenales, agregar las dos quincenas en un solo archivo |
| Código de concepto de 3 dígitos | Del catálogo ISLR (tabla de conceptos con sus códigos) |
| Codificación | Respetar la del layout vigente (ISO-8859-1 en la referencia) |

### Criterios de aceptación
1. **Un TXT y un XML aceptados por el portal** (anonimizables) como fixtures dorados del exportador.
2. Generación **determinista** desde un período cerrado; `layout_version`, `sha256` y fecha en `generated_reports`.
3. **Prueba de carga real** de un archivo del período piloto por el contador antes del go-live.
4. Test de regresión: mismo período ⇒ mismo archivo (byte a byte).

**Si el cliente no puede entregar muestras:** implementar con los layouts de arriba, marcar `layout_version = "reconstruido"` y **exigir la prueba de carga** como gate; sin ella el reporte no se declara "listo".

---

## 4. Parámetros ISLR (R-E6, R-E7, R-O4)

| Parámetro | Respuesta recomendada | Certeza | Cómo confirmarlo |
|---|---|---|---|
| **Conceptos pagados** | Los que aparezcan en el **mes real** (frecuencia por concepto y tipo de beneficiario). Lista base probable: honorarios (9.1.b), servicios/contratistas (9.11), arrendamiento de inmuebles (9.12), fletes (9.15), comisiones (9.2), publicidad (9.19). El catálogo completo del art. 9 se carga **deshabilitado**; cada empresa habilita solo los suyos | 🟡 | Informe de conceptos sobre M-1 firmado por el contador |
| **Base con o sin IVA** | **Sin IVA** como valor por defecto, como parámetro por concepto. Apoyo: para tarjetas de crédito la base se obtiene dividiendo el monto entre `(alícuota/100)+1`; las calculadoras y tablas de práctica trabajan sobre el monto neto. Contra-nota: el art. 16 §2 del Decreto habla de "precio total facturado" en servicios, y no verifiqué un criterio expreso de la Administración sobre el IVA | 🟡 | RDF del contador (cambia todos los montos) |
| **Sustraendo en pagos parciales** | **Criterio A: se aplica en cada pago o abono** (cada operación es una retención). Apoyo: la rutina de generación del XML calcula el sustraendo **por fila de operación**; el factor `83,3334` y la fórmula `UT × % × 83,3334` están confirmados en las tablas de práctica | 🟡 | RDF; escenario `ISLR-07` (1.285,00 vs. 1.392,50) |
| **UT aplicable** | **UT vigente a la fecha de la retención** (fecha del evento pago/abono), versionada con vigencia. Valor actual **43,00** (G.O. 43.140, 02-jun-2025). No encontré reajuste posterior en el boletín de una firma local que reporta cada cambio; **verificar en Gaceta/portal antes de firmar** | ✅ / 🟡 | Cotejo en Gaceta |
| **Mínimos** | **PJ domiciliada: sin mínimo** (las tablas de práctica no muestran mínimo; los importes nominales de 1997 quedaron sin efecto tras las reconversiones). **PN residente:** el piso es el propio sustraendo (retención = 0 si `base × % ≤ sustraendo`) | 🟡 | RDF |
| **Beneficiarios no residentes/no domiciliados** | Registrar y marcar "requiere revisión del contador" en v1 (tarifa acumulada) | ❓ | Cliente: ¿pagan a no residentes? |

**Mini-protocolo para cerrar los conceptos en una hora:** ejecutar `import:autodetect` sobre M-1, agrupar por proveedor y tipo, y entregar al contador una tabla "proveedor → concepto propuesto → % → ejemplo calculado". Él marca aprobado/modifica.

---

## 5. Fuente del Libro de Ventas por sucursal y Z real (R-O2, R-E2)

### Lo verificado
- ✅ La Administración sanciona **no emitir el Reporte Z (reporte global diario) por cada día de operación** con máquina fiscal (art. 101, num. 1 del COT, según decisiones contencioso-tributarias).
- ✅ Los libros de ventas reales incluyen columnas de **máquina fiscal N.º** y **reporte Z N.º** (formato del art. 76 del Reglamento de la Ley del IVA, según ejemplos de libros).
- ✅ Existen **talonarios de contingencia**: facturas manuales que conviven con la máquina cuando falla.

### Respuesta recomendada
| Situación de la sucursal | Fuente del libro |
|---|---|
| Opera con **máquina fiscal** | **Reporte Z diario** (una línea por Z) + NC/ND y **facturas de contingencia** individuales |
| Sin máquina (factura por imprenta/digital) | **Factura individual** |
| Ambas a la vez | Modo Z + facturas de contingencia marcadas |

### Cambio de regla (hallazgo)
El control F8 de "convivencia" **bloquea** mezclar Z y factura individual en la misma sucursal/período. Eso es demasiado rígido: las facturas de contingencia son legítimas. **La invariante correcta es "no contar dos veces":** una factura individual cuyo N.º caiga **dentro del rango `factura_desde–factura_hasta` de una Z** es duplicado y se bloquea; fuera de todo rango, se acepta como contingencia.

### Qué pedir al cliente (por sucursal)
1. ¿Tiene máquina fiscal? Marca, modelo y serial; ¿cuántas?
2. **Todos los Z de un mes** (incluidos días sin ventas), con rango de facturas.
3. Facturas de contingencia o manuales del mes y cómo las asienta hoy en el libro.
4. ¿Cambió alguna máquina en el año? (cambio de serial)
5. ¿Cómo muestra su libro actual la sucursal: una línea por día o por factura?

---

## 6. Mes real y libros del contador (M-1…M-4)

### Qué mes elegir
Un mes **ya declarado, sin declaración sustitutiva** y con la planilla archivada. Debe contener, idealmente:

| Caso | Mínimo |
|---|---|
| Notas de crédito/débito | ≥ 1 de cada una, con su documento afectado |
| Compras exentas o sin derecho a crédito | ≥ 1 |
| Retención de IVA emitida (si es SPE) | ≥ 3 proveedores, 1 comprobante multi-factura |
| Retención de ISLR | ≥ 1 a PJ domiciliada y ≥ 1 a PN residente |
| Pago parcial o abono previo al pago | ≥ 1 |
| Retención recibida (G3) | ≥ 1; idealmente 1 comprobante tardío |
| Ventas con Z | Mes completo por máquina, con ≥ 1 día sin ventas |
| Documento pagado después del cierre del mes | ≥ 1 |

### Qué entregar (además de M-1…M-4)
- **M-5: la planilla de declaración de IVA** del período y, si aplica, **los archivos TXT/XML enviados** al portal con su acuse de aceptación: son el **oráculo** de R-O3, R-E7 y R-E8.
- Comprobantes de retención (IVA e ISLR) emitidos en el mes.
- **Lista de ajustes manuales** que el contador aplica en su Excel (para clasificar diferencias como D2).
- Una nota con el **sistema de origen** (nombre, versión, cómo se exporta, separador, codificación, decimal, fecha).

### Anonimización y entrega
- Mismo mapa determinista para el CSV y para los Excel del contador (RIF falso consistente por tercero; importes y fechas intactos).
- El mapa de equivalencias **no** va al repositorio.
- Entrega cifrada (clave por canal distinto) con manifiesto `sha256`.
- Si el cliente no puede anonimizar, se trabaja en un entorno restringido con confidencialidad firmada.

---

## 7. Columnas de libros y resumen (R-O1…R-O3, R-E1…R-E3)

### ¿El XLSX tiene 5 pestañas?
Muy probablemente **sí**: el archivo se llama `formatos_libro_de_compras_libro_de_ventas_resumen_comprobante_ret_de_islr_comprobante_de_retencion_iva.xlsx`, es decir, cinco formatos: **Libro de Compras, Libro de Ventas, Resumen, Comprobante de ISLR y Comprobante de IVA**. `golden:inspect` ya reportó 0 `#REF!`.

### Qué es obligatorio (✅)
- Libros y resumen se rigen por los **arts. 70–78 del Reglamento de la Ley del IVA**; las sanciones por libros incompletos se aplican por incumplir los arts. 70, 75 y 76.
- **Art. 72:** el **resumen** al final del período indica la base imponible y el impuesto y **debe coincidir con los datos de la declaración**.
- Art. 75 (compras) exige, entre otros, el número de factura; art. 76 (ventas) exige nombre y RIF del comprador cuando aplica.

### Columnas mínimas propuestas (🟡 a cotejar con el XLSX)

**Libro de Compras:** N.º de operación · fecha de la factura · RIF y razón social del proveedor · tipo de documento (factura/ND/NC/importación) · N.º de factura · N.º de control · N.º de ND/NC y **documento afectado** · total de compras incluido IVA · compras exentas/sin derecho a crédito fiscal · base imponible · alícuota % · impuesto (crédito fiscal) · **IVA retenido por el comprador** (N.º de comprobante, fecha, % y monto).

**Libro de Ventas:** N.º de operación · fecha · **máquina fiscal N.º y reporte Z N.º** (o N.º de factura) · rango de facturas · N.º de control · cliente y RIF (cuando aplica) · total de ventas incluido IVA · ventas exentas/exoneradas/no sujetas · base imponible y débito fiscal **por alícuota** (general, adicional, reducida) · ventas por cuenta de terceros · **IVA retenido por el comprador** (retención recibida).

**Resumen:** por clasificación y alícuota, bases y débitos/créditos; excedente de crédito del período anterior y para el siguiente; saldo de retenciones no aplicado; retenciones del período; cuota resultante, **coincidente con la planilla**.

### Cómo evitar el problema de fondo
Generar los libros con un **mapa de columnas configurable** (por empresa y régimen) y no con columnas fijas en código. Así ordinarios y especiales, con o sin columnas de retención, son configuración. Se suma el **checklist de campos exigidos** (ROADMAP-01 WS3A) firmado por el contador sobre el XLSX.

---

## 8. Redondeo y tasa BCV

### 8.1 Redondeo (G8)

**Recomendación**
| Etapa | Regla |
|---|---|
| Cálculos intermedios (alícuotas, divisiones `monto/(1+alícuota)`, factores) | Precisión de **8 decimales** (lectura natural de "8 cifras decimales") |
| IVA de un documento | `round2( Σ base_i × alícuota )` **por grupo de alícuota** del documento (no por línea) |
| Retención de IVA / ISLR | `round2` **por factura** dentro del comprobante |
| Totales de comprobante, libro y resumen | **Suma de los valores ya redondeados**; sin re-redondeo |
| Modo | HALF_UP (el actual) |

Principio rector: **"lo declarado es la suma de lo impreso"** — así los totales del libro, el resumen y los comprobantes cuadran entre sí.

**Se confirma por evidencia, no por opinión:** correr `g8:calibrate` (12 combinaciones) sobre el mes real; la combinación que reproduce el legacy con **0 diferencias** se propone al contador. La retrospectiva ya mostró el caso `1.179,12` vs. `1.179,11` (por línea vs. total).

**Dos tolerancias, dos propósitos (cierra el desorden detectado):**
| Tolerancia | Uso | Valor |
|---|---|---|
| Aritmética del documento del proveedor (Inv.1: base + IVA vs. total) | El proveedor pudo redondear distinto | `0.01` |
| Agregados derivados (libro, resumen, conciliación, comparación Excel) | Son sumas de valores redondeados | `0.00` |

### 8.2 Tasa de cambio (G4) — lo que hay y lo que no hay que usar

- ✅ Desde la reforma de la Ley del IVA (2020), la **factura debe expresar la moneda en que se pagó y su equivalente en bolívares, con indicación del tipo de cambio aplicable**, la base imponible, el impuesto y el total.
- ✅ La referencia a "la moneda de mayor valor del BCV" (hoy, en la práctica, el euro) se usa para **umbrales y calificaciones** (p. ej. SPE), **no** para convertir facturas en divisas. **No mezclar los dos conceptos.**

**Recomendación para v1**
1. Documentos en bolívares: sin cambio.
2. Documentos en divisas: se **captura la tasa impresa en la factura**, con `currency`, `fx_rate`, `fx_rate_date` y `fx_rate_source = "factura"`; la base en bolívares es la que muestra la factura. Si falta la tasa o el equivalente, **advertencia bloqueante** hasta corregir.
3. Verificación opcional contra la tasa oficial del BCV del día del hecho imponible, solo como **alerta de coherencia**, nunca para recalcular.
4. **Retención de ISLR sobre pagos en divisas:** convertir el pago a bolívares a la tasa oficial del **día del pago/abono** (🟡, confirmar con el contador).
5. **Diferencia cambiaria:** **fuera de v1** (es un tema de ISLR anual/contabilidad, no del cálculo de retenciones ni del IVA).
6. **IGTF** (pagos en divisas): es un hecho aparte que no integra la base del IVA; hay evidencia de un **3 %** sobre pagos en divisas, y también boletines sobre exoneración o fijación al 0 %. **Registrar como campo informativo** y preguntar al contador la alícuota vigente.

**Si el cliente no puede decidir:** v1 opera 100 % en bolívares, y los documentos en divisas se aceptan solo si traen tasa y equivalente.

---

## 9. Hallazgos que modifican el requerimiento o la documentación

| # | Hallazgo | Dónde afecta | Propuesta |
|---|---|---|---|
| H-1 | El estatus SPE puede ser **revocado** y cambia el régimen a mitad de año | `updateFiscalProfile`, `period_kind` inmutable, R-E* | `company_fiscal_status` con vigencia (§1) |
| H-2 | La numeración del **comprobante de IVA** es `AAAAMM`+8 dígitos y **no incluye quincena** | R-E5 y `DATABASE.md` (`period_key YYYYMM-Q1/Q2`) | Serie por RIF con `reset_policy`; la quincena es del enteramiento, no de la numeración |
| H-3 | Un comprobante puede agrupar todas las retenciones de la **quincena** de un mismo proveedor (✅ art. 16) y debe entregarse en los **2 primeros días hábiles del período de imposición siguiente** | R-E5 | Agrupación por proveedor/quincena + plazo desde el calendario de feriados |
| H-4 | El **XML de ISLR espera porcentajes en puntos** y N.º de control ≤ 8 dígitos | R-O4, R-E7 | Conversión solo en el borde + normalización |
| H-5 | Facturas de **contingencia** conviven con Z | Control F8 / G7 | Control de **solape de rangos** |
| H-6 | **Dos tolerancias** (0,01 y 0) coexisten sin criterio | T06, `summary.ts`, `excel-compare.ts` | Separar por propósito (§8.1) |
| H-7 | Factura en divisas **ya trae la tasa** (obligatorio desde 2020) | G4/ADR-013 | Capturar la impresa; no recalcular |
| H-8 | Libros: el **resumen debe coincidir con la planilla** (art. 72) | R-O1…R-O3 | Test de coincidencia libro ↔ resumen ↔ planilla (M-5) |
| H-9 | Comprobantes de IVA **en papel** deben emitirse por duplicado; en electrónico, solo si el proveedor lo acepta (✅ art. 16) | R-E5 | Campo `acepta_comprobante_electronico` + marca ORIGINAL/COPIA |

---

## 10. Hoja de confirmación para el cliente/contador (marcar y devolver)

| # | Pregunta | Opciones |
|---|---|---|
| 1 | La empresa piloto 1 es… | ☐ Especial (adjuntar acto) ☐ Ordinaria ☐ Fue especial y se revocó (fecha: ___) |
| 2 | Numeración ISLR actual | ☐ Seguir la mía (adjuntar muestra y último N.º) ☐ Usar `AAAAMM`+8 dígitos |
| 3 | TXT de IVA y XML de ISLR en v1 | ☐ Sí, ambos ☐ Solo XML ☐ Solo TXT ☐ No (indicar motivo) · Muestras aceptadas: ☐ TXT ☐ XML |
| 4a | Base de ISLR | ☐ Sin IVA ☐ Con IVA ☐ Según concepto (indicar) |
| 4b | Sustraendo en pagos parciales (PN residente) | ☐ En cada pago ☐ Una vez por factura |
| 4c | Mínimo para PJ domiciliada | ☐ Ninguno ☐ Otro (indicar) |
| 4d | ¿Pagan a no residentes? | ☐ No ☐ Sí (conceptos: ___) |
| 5 | Sucursales con máquina fiscal | ☐ Todas ☐ Algunas (cuáles: ___) ☐ Ninguna · ¿Facturas de contingencia? ☐ Sí ☐ No |
| 6 | Mes entregado para M-1…M-5 | Mes: ___ · ☐ declarado sin sustitutivas · ☐ planilla y archivos enviados incluidos |
| 7 | El XLSX de 5 formatos cumple las columnas de §7 | ☐ Sí ☐ No (corregir: ___) · Orden de filas del libro: ☐ por fecha ☐ por N.º de factura ☐ otro |
| 8a | Redondeo | ☐ Calibración empírica y firmo el resultado ☐ Defino yo: ___ |
| 8b | Operaciones en divisas | ☐ No ☐ Sí: ☐ usar tasa de la factura ☐ otra (indicar) · IGTF vigente: ___ % |

---

## 11. Fuentes consultadas y límites

**Fuentes (todas secundarias; ninguna es la Gaceta Oficial):**
- Boletín Forvis Mazars 03-2026, *Revocación de oficio del status de SPE* (8-jul-2026) y boletín 02-2020 (reforma de la Ley del IVA).
- Providencia SNAT/2025/000054 (texto) y Decreto 1.808 (texto) en la documentación de Cachicamo.
- Guía de elaboración del TXT de retención de IVA (estructura de 16 columnas) y rutina publicada de generación del XML de ISLR.
- Tabla de retenciones ISLR (UT 43) de Grant Thornton y tablas de Mazars (sustraendo `UT × % × 83,3334`; base de tarjetas).
- Decisiones del contencioso tributario sobre libros (arts. 70–78 del Reglamento de la Ley del IVA) y Reporte Z.

**Límites:**
1. Los layouts TXT/XML provienen de guías y rutinas de terceros; el XML de referencia es antiguo. **Se validan con una muestra aceptada y con la prueba de carga del portal.**
2. No verifiqué en fuente primaria: base de ISLR con/sin IVA, vigencia de la UT posterior a junio de 2025, la alícuota actual del IGTF, ni el texto íntegro de los arts. 70–78.
3. Las respuestas 🟡 son recomendaciones de práctica; **el contador debe firmarlas** (RDF) antes de pasar a código.
4. No he visto el XLSX ni los CSV reales; las columnas de §7 son un mínimo a cotejar.
