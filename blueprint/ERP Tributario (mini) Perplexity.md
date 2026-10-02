<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# tengo algunos formatos en un archivo xls, se me esta pidiendo un sistema capaz de generar cada uno de esos formatos, alimentandolo con la info necesaria.

toma en cuenta el contexto legal, el venezolano, leyes y reglamentos, sistemas similares, como se aborda el problema principal, como se alcalza el objetivo

Lo que tienes no es solo “varios formatos Excel”: es el núcleo de un **sistema tributario-contable venezolano** que debe centralizar compras, ventas y retenciones para producir automáticamente libros de IVA, resúmenes de declaración y comprobantes de retención de IVA e ISLR.

El enfoque correcto es construir una aplicación que registre los **documentos fuente** —facturas, notas de crédito/débito, reportes Z, pagos y retenciones— y, desde esa información única, genere los cinco formatos del archivo. No conviene digitalizar cada plantilla como un formulario independiente: eso duplicaría datos, causaría inconsistencias y dificultaría las auditorías.

El archivo suministrado contiene:

- **Libro de Compras IVA**
- **Libro de Ventas IVA**
- **Resumen de compras y ventas**, orientado a la determinación del IVA del período
- **Comprobante de retención de ISLR**
- **Comprobante de retención de IVA**[^1_1]


## Problema principal

Actualmente el proceso parece estar basado en Excel y en carga manual de información. Eso suele generar estos riesgos:

- Duplicación de datos entre el libro de compras, comprobantes y resumen tributario.
- Errores de cálculo de base imponible, IVA causado, IVA retenido o totales.
- Falta de trazabilidad: es difícil saber quién creó, modificó o anuló un registro.
- Numeración de comprobantes de retención potencialmente repetida o no controlada.
- Problemas al manejar notas de crédito y débito, documentos afectados, facturas anuladas y períodos cerrados.
- Dependencia de fórmulas frágiles de Excel; de hecho, en el resumen suministrado aparece una referencia rota (`#REF!`), que evidencia por qué las reglas deben estar en el sistema y no dispersas en celdas.[^1_1]
- Riesgo de emitir un comprobante sin que sus datos coincidan exactamente con el libro de compras, el libro de ventas o la declaración.

La necesidad real es: **registrar la operación una vez, aplicar reglas tributarias parametrizables, validar la información y emitir reportes/documentos consistentes, auditables y exportables**.

## Contexto legal venezolano

El sistema debe diseñarse con base en el marco normativo venezolano, pero con una arquitectura que permita cambiar tasas, providencias, calendarios y criterios sin reprogramar toda la aplicación. La normativa tributaria puede modificarse y su aplicación depende también de la condición concreta del contribuyente —ordinario, especial, agente de retención designado, actividad económica y período fiscal—, por lo que un contador o asesor tributario debe validar la configuración inicial antes de operar en producción.


| Área | Exigencia funcional que debe atender el sistema |
| :-- | :-- |
| Libros de IVA | Registrar cronológicamente compras y ventas, con identificación de contraparte, factura, control, tipo de transacción, montos, base imponible, alícuota e impuesto |
| Resumen del período | Consolidar base imponible, débitos fiscales, créditos fiscales, ajustes, excedentes y retenciones para soportar la determinación del IVA |
| IVA con múltiples alícuotas | Separar operaciones por alícuota: general, reducida, adicional, exentas/no sujetas, exportaciones e importaciones |
| Retención de IVA | Emitir comprobantes consecutivos con datos del agente, proveedor, factura, control, base, IVA causado y monto retenido |
| Retención de ISLR | Calcular y documentar retenciones según naturaleza del pago, beneficiario, porcentaje, sustraendo y base aplicable |
| Conservación y auditoría | Mantener documentos, registros, numeraciones, estados y evidencia de modificaciones/anulaciones |
| Declaración | Generar resúmenes conciliables con la información que se presentará al SENIAT |

El Reglamento de la Ley de IVA exige que los contribuyentes lleven Libro de Compras y Libro de Ventas. Además, establece que al cierre de cada período se prepare un resumen de base imponible, impuesto, crédito y débito fiscal, ventas exentas/no sujetas y exportaciones; cuando existan distintas alícuotas, las operaciones deben presentarse separadas por alícuota.[^1_2]

Esto se refleja directamente en las secciones de “Resumen de Compras” y “Resumen de Ventas” del archivo: compras no gravadas, importaciones, operaciones gravadas a alícuota general, adicional y reducida; así como ventas no gravadas, exportaciones, ventas por cuenta de terceros y débitos/créditos fiscales.[^1_1]

### Retenciones de IVA

El comprobante de retención de IVA no debe ser simplemente un PDF bonito. Debe provenir de una retención efectivamente calculada y vinculada a una o más facturas del proveedor.

Los elementos relevantes incluyen:

- Numeración consecutiva controlada.
- Identificación y RIF del agente de retención.
- Identificación y RIF del proveedor.
- Fecha de emisión y de entrega.
- Número de factura, nota de débito, nota de crédito afectada y número de control.
- Total facturado.
- Base imponible.
- IVA causado.
- Porcentaje de retención y monto retenido.
- Estado del comprobante: emitido, entregado, anulado o reemplazado.
- Copia inalterable de la información emitida.

La normativa y referencias especializadas indican que el comprobante debe permitir identificar consecutivamente la operación, las partes y los valores de factura, base, impuesto causado e impuesto retenido. También debe registrarse tanto por el agente como por el proveedor en los libros correspondientes al período de emisión y entrega.[^1_3][^1_4]

Importante: la búsqueda muestra que en 2025 se difundieron nuevas providencias de retención de IVA que sustituyeron el régimen anterior en ciertos aspectos. El sistema no debe fijar de manera rígida el 75%, 100% ni ninguna alícuota de retención; debe manejar una **tabla de reglas versionada por vigencia**, tipo de contribuyente y supuesto legal aplicable.[^1_5][^1_6]

### Retenciones de ISLR

El comprobante de ISLR del archivo contiene:

- Fecha de emisión y entrega.
- Número de comprobante.
- Datos del agente de retención.
- Datos del contribuyente o beneficiario.
- Factura, número de control y fecha.
- Concepto de pago.
- Base imponible.
- Porcentaje de retención.
- Sustraendo.
- Monto retenido.[^1_1]

El Reglamento Parcial de la Ley de ISLR en materia de retenciones, conocido comúnmente por el Decreto N.º 1.808, es la referencia clave para determinar conceptos sujetos, porcentajes, bases y sustraendos. El comprobante respalda la retención practicada y debe reflejar, entre otros datos, el monto pagado o abonado en cuenta y la cantidad retenida.[^1_7][^1_8]

Para servicios, por ejemplo, la base de retención puede requerir considerar el precio total facturado como contraprestación según el supuesto aplicable; por eso no se debe asumir mecánicamente que la base de ISLR es siempre el subtotal sin IVA. Esa regla debe depender de una configuración tributaria validada para cada concepto de pago.[^1_9]

## Solución propuesta

La propuesta es un **Sistema de Gestión de Libros Fiscales y Retenciones** orientado inicialmente a una empresa, pero diseñado como multiempresa si el cliente es un escritorio contable, grupo empresarial o proveedor de servicios administrativos.

La arquitectura funcional debe partir de una **fuente única de verdad**:

```text
Proveedores / Clientes
        ↓
Facturas y documentos fiscales
        ↓
Pagos, abonos y condiciones de retención
        ↓
Motor de reglas tributarias
        ↓
Compras | Ventas | Retenciones IVA | Retenciones ISLR
        ↓
Libros fiscales + Comprobantes + Resumen IVA + Exportaciones
```


### Módulos del sistema

| Módulo | Objetivo | Resultado |
| :-- | :-- | :-- |
| Empresas y configuración fiscal | Configurar RIF, razón social, domicilio, condición tributaria, períodos y series documentales | Base legal-operativa de cada empresa |
| Terceros | Administrar clientes, proveedores, RIF, dirección fiscal y condición tributaria | Datos reutilizables y validados |
| Compras | Registrar facturas, importaciones, notas de crédito/débito, exentos y documentos afectados | Libro de compras y base para retenciones |
| Ventas | Registrar facturas, reportes Z, notas de crédito/débito, exportaciones y ventas a terceros | Libro de ventas y débitos fiscales |
| Retenciones IVA | Determinar, generar, numerar y emitir comprobantes de retención IVA | PDF/Excel y registro fiscal trazable |
| Retenciones ISLR | Aplicar reglas por concepto de pago y emitir comprobantes | Retenciones calculadas y soportadas |
| Períodos fiscales | Abrir, validar, cerrar y bloquear períodos mensuales o quincenales | Integridad histórica de los libros |
| Reportes | Libros, resumen IVA, comprobantes, auditoría, conciliaciones y exportaciones | Salidas compatibles con operación contable |
| Auditoría | Registrar usuario, fecha, cambio, motivo y documento afectado | Evidencia ante revisión interna o fiscal |
| Parametrización tributaria | Versionar alícuotas, porcentajes, conceptos, sustraendos y vigencias | Adaptación a cambios legales sin despliegue |

## Modelo operativo recomendado

### 1. Registrar documentos fuente

El usuario no debe escribir directamente en el Libro de Compras o Libro de Ventas como si fueran hojas de Excel.

Debe registrar una operación fiscal con datos como:

- Empresa y período fiscal.
- Tipo de documento: factura, factura fiscal, nota de crédito, nota de débito, importación, reporte Z, documento de ajuste.
- Fecha de emisión y fecha de recepción.
- Proveedor o cliente.
- RIF y dirección fiscal.
- Número de factura.
- Número de control.
- Número de comprobante de retención, si existe.
- Documento afectado en el caso de nota de crédito/débito.
- Clasificación tributaria de la operación.
- Montos gravados, exentos/no sujetos, IVA y total.
- Alícuota de IVA aplicable.
- Evidencia adjunta: PDF, XML, imagen o escaneo de factura.
- Estado: borrador, validado, contabilizado, retenido, anulado, cerrado.


### 2. Clasificar tributariamente

Cada operación debe tener una clasificación explícita. Por ejemplo:

**Compras**

- Compra interna gravada a alícuota general.
- Compra interna gravada a alícuota reducida.
- Compra con alícuota general más adicional.
- Compra exenta, exonerada o sin derecho a crédito fiscal.
- Importación gravada.
- Importación exenta o no gravada.
- Nota de crédito.
- Nota de débito.
- Ajuste de períodos anteriores.

**Ventas**

- Venta interna gravada a alícuota general.
- Venta interna gravada a alícuota reducida.
- Venta con alícuota adicional.
- Venta exenta, exonerada o no sujeta.
- Exportación.
- Venta por cuenta de terceros.
- Nota de crédito.
- Nota de débito.
- Reporte Z de máquina fiscal o sistema autorizado.

Esta clasificación alimenta automáticamente las líneas correctas del resumen tributario.

### 3. Calcular sin depender de fórmulas editables

Los cálculos deben vivir en servicios de dominio y quedar almacenados como resultado reproducible:

$$
\text{IVA causado} = \text{Base imponible} \times \text{Alícuota IVA}
$$

$$
\text{Total factura} = \text{Base imponible} + \text{IVA causado} + \text{Conceptos adicionales permitidos}
$$

$$
\text{IVA retenido} = \text{IVA causado} \times \text{Porcentaje de retención}
$$

$$
\text{ISLR retenido} = \max\left(0,\;(\text{Base sujeta} \times \text{Porcentaje}) - \text{Sustraendo}\right)
$$

Pero esas fórmulas solo son la capa matemática. La lógica real debe evaluar:

- Si el proveedor está sujeto o no a retención.
- Si el agente está obligado/designado para retener.
- La vigencia de la norma aplicable.
- El tipo de operación y concepto de pago.
- La residencia o condición del beneficiario, cuando aplique a ISLR.
- La existencia de límites, mínimos, sustraendos o excepciones.
- Si la factura tiene componentes que no forman parte de la base aplicable.
- Si la operación ya fue retenida total o parcialmente.
- Si el documento fue anulado, corregido o afectado por nota de crédito.


### 4. Generar comprobantes con control de numeración

El sistema debe tener series independientes, bloqueadas y auditables:

- Serie de comprobantes de retención IVA.
- Serie de comprobantes de retención ISLR.
- Series por empresa.
- Posiblemente series por sucursal, establecimiento o ejercicio, si la operación lo requiere.

Para IVA, tu formato ya usa una estructura similar a:

```text
AAAAMMSSSSSSSS
20260900000521
```

La aplicación debe generar el número dentro de una transacción de base de datos con bloqueo para impedir duplicados, incluso si trabajan varios usuarios al mismo tiempo. El número no puede recalcularse ni reutilizarse luego de emitido; si hay un error, se debe emitir una anulación o documento sustitutivo trazable, según el procedimiento definido por el asesor tributario.

### 5. Cerrar el período

El cierre es una parte crítica del sistema.

Al cerrar un período, por ejemplo del 1 al 15 de septiembre o el mes completo, el sistema debe:

1. Validar que no haya documentos incompletos, duplicados o con RIF/números fiscales inválidos.
2. Consolidar libros de compras y ventas.
3. Calcular resúmenes de débito y crédito fiscal.
4. Incorporar notas de crédito, notas de débito y ajustes.
5. Considerar excedentes de crédito fiscal anteriores y retenciones, según aplique.
6. Generar una versión congelada del resumen.
7. Bloquear modificaciones directas sobre los documentos del período.
8. Permitir correcciones solo mediante documentos de ajuste, reapertura controlada o una nueva versión autorizada.
9. Registrar usuario responsable, fecha, hora y motivo del cierre.

Esto protege al cliente frente a inconsistencias entre lo declarado y lo archivado.

## Entregables funcionales

El sistema debe producir al menos los siguientes resultados.

### Libro de Compras IVA

Debe contener las columnas que se observan en la plantilla:

- Número de operación.
- Fecha.
- RIF.
- Nombre o razón social.
- Número de comprobante de retención.
- Factura, nota de crédito o nota de débito.
- Número de control.
- Datos de importación, cuando correspondan.
- Tipo de transacción.
- Documento afectado.
- Total de compras con IVA.
- Compras exentas o sin derecho a crédito fiscal.
- Base imponible.
- Alícuota.
- IVA causado.
- IVA retenido.
- Totales y resumen por clasificación tributaria.[^1_1]


### Libro de Ventas IVA

Debe generar:

- Número de operación.
- Fecha.
- RIF y razón social.
- Número de comprobante.
- Reporte Z, si aplica.
- Rango de facturas.
- Número de control.
- Notas de débito y crédito.
- Tipo de transacción.
- Documento afectado.
- Ventas totales.
- Ventas exentas.
- Cobros por cuenta de terceros.
- Base imponible.
- Alícuota.
- IVA causado.
- IVA retenido.
- Resumen tributario por tipo de venta.[^1_1]


### Resumen para determinación del IVA

Debe consolidar automáticamente:

- Débitos fiscales por ventas.
- Créditos fiscales por compras.
- Operaciones exentas/no gravadas.
- Operaciones de exportación.
- Operaciones por alícuota.
- Ajustes de períodos anteriores.
- Créditos fiscales deducibles.
- Excedentes del mes anterior.
- Cuota tributaria del período.
- Retenciones acumuladas, del período, aplicadas y no aplicadas.
- Total a pagar o excedente trasladable.

Este resumen debe poder compararse con el formulario y la declaración que corresponda, sin afirmar que el sistema sustituye la presentación oficial ante el SENIAT.[^1_2][^1_1]

### Comprobante de retención IVA

Debe emitirse en PDF y opcionalmente Excel, incluyendo:

- Identidad visual y datos fiscales de la empresa.
- Número único de comprobante.
- Fecha de emisión y entrega.
- Datos del agente y proveedor.
- Una o múltiples facturas incluidas.
- Factura, control, documento afectado y fecha.
- Total facturado, base, IVA causado y porcentaje/monto retenido.
- Espacios de firma y sello, si el flujo del cliente sigue requiriendo soporte físico.
- Código QR para verificación interna, recomendado aunque no debe presentarse como sustituto de un requisito legal sin validación.
- Estado documental y hash de integridad interno.

El formato del archivo contempla una línea de factura, pero el modelo debe soportar **múltiples líneas por comprobante**, pues es una necesidad operativa frecuente.[^1_1]

### Comprobante de retención ISLR

Debe incluir:

- Numeración y fecha de emisión/entrega.
- Agente de retención.
- Contribuyente retenido.
- Factura y número de control.
- Fecha del pago o abono en cuenta, según el caso aplicable.
- Concepto de pago configurable.
- Monto total facturado o pagado.
- Base sujeta a retención.
- Porcentaje.
- Sustraendo.
- Monto retenido.
- Totales cuando cubra varias operaciones.
- Firma/sello o mecanismo de validación electrónica definido por el cliente.

La emisión debe quedar vinculada al pago o abono en cuenta, no únicamente a la existencia de una factura, porque el momento de retención es jurídicamente relevante y debe modelarse de forma explícita.[^1_8][^1_10]

## Reglas y validaciones críticas

El valor del sistema estará principalmente en las validaciones. Algunas indispensables:

- Validar estructura formal del RIF venezolano y conservar el valor exacto registrado.
- Prevenir duplicidad por empresa, proveedor/cliente, tipo de documento, número de factura y número de control.
- Exigir documento afectado para notas de crédito y débito.
- Evitar que una nota de crédito exceda los montos disponibles de la factura afectada, salvo flujo autorizado de ajuste.
- Validar que base + IVA + componentes permitidos concilien con el total.
- Diferenciar una compra exenta de una compra sin derecho a crédito fiscal.
- Separar IVA causado de IVA retenido.
- Impedir retener más IVA que el IVA causado de la operación, salvo que la regla tributaria configurada autorice un caso específico.
- Alertar cuando una retención de ISLR no tiene concepto tributario o regla de cálculo asociada.
- Bloquear cambios a comprobantes emitidos.
- Evitar reutilización de números de comprobante.
- Mantener historial completo de cambios.
- Alertar documentos fuera del período en cierre.
- Mostrar diferencias entre el resumen y las operaciones que lo componen.
- Permitir conciliación entre compras retenidas y comprobantes de retención IVA emitidos.
- Permitir exportación detallada para contador, auditoría y respaldo.


## Diseño técnico recomendado

Por tu perfil técnico, una primera versión sólida podría construirse con una arquitectura modular de Laravel, PostgreSQL y una interfaz Livewire o Next.js según la experiencia de usuario requerida.


| Capa | Recomendación |
| :-- | :-- |
| Backend | Laravel, con módulos de dominio y servicios de cálculo tributario |
| Base de datos | PostgreSQL, con `numeric(18,2)` o precisión superior para dinero; nunca `float` |
| Interfaz | Laravel + Livewire/Alpine/Tailwind para velocidad de desarrollo; Next.js si habrá portal externo o una UX muy rica |
| PDFs | Plantillas HTML/CSS convertidas a PDF y almacenadas como versión emitida |
| Excel | Laravel Excel / PhpSpreadsheet para exportar en la misma estructura de las plantillas existentes |
| Autorización | Roles: administrador, operador de compras, operador de ventas, analista tributario, contador, auditor, solo lectura |
| Auditoría | Eventos inmutables de creación, modificación, emisión, anulación, cierre y reapertura |
| Archivos | Almacenamiento privado de soportes documentales con enlaces firmados |
| Despliegue | Docker, PostgreSQL con backups verificables, almacenamiento de objetos y monitoreo |
| Pruebas | Tests de cálculo por escenarios tributarios, snapshots de PDFs/Excel y pruebas de regresión por período |

### Entidades principales

Un modelo inicial podría incluir:

```text
companies
tax_profiles
fiscal_periods
tax_rates
tax_rules
withholding_rules
withholding_concepts
document_series

parties
party_tax_profiles
party_addresses

purchase_documents
purchase_document_lines
sales_documents
sales_document_lines
fiscal_document_adjustments

payments
payment_allocations

iva_withholdings
iva_withholding_lines
islr_withholdings
islr_withholding_lines

generated_reports
generated_report_versions
attachments
audit_events
```


### Decisiones importantes

- Guardar importes en `numeric`, no en `float`.
- Versionar reglas tributarias por fecha de vigencia.
- Separar “documento fuente”, “evento de retención” y “comprobante emitido”.
- Conservar un *snapshot* de los datos del comprobante al momento de emitirlo.
- No editar un comprobante emitido: usar anulación, reverso o sustitución.
- Usar identificadores internos UUID y numeraciones fiscales separadas.
- Respaldar diariamente base de datos y documentos.
- Registrar zona horaria, usuario, IP/sesión y fecha exacta de cada emisión.
- Diseñar desde el inicio para múltiples empresas, aunque se implemente inicialmente para una sola.


## Cómo alcanzar el objetivo

La implementación debe hacerse por fases, porque intentar abarcar todos los casos tributarios desde el primer día puede atrasar el proyecto y crear una falsa sensación de cumplimiento.

### Fase 0: levantamiento tributario

Antes de programar:

- Identificar si la empresa es contribuyente ordinario, especial o agente de retención.
- Confirmar periodicidad real: mensual, quincenal u otra asociada al calendario aplicable.
- Determinar las alícuotas vigentes que usará el cliente.
- Definir qué tipos de venta y compra realiza.
- Definir si emite facturas, usa máquinas fiscales, reportes Z, sistema de facturación u otro medio.
- Listar conceptos sujetos a retención de ISLR.
- Definir reglas de IVA retenido por tipo de proveedor y operación.
- Validar formato y política de numeración de comprobantes.
- Revisar con contador el mapeo entre el resumen del sistema y la declaración aplicable.
- Identificar qué información llega desde otros sistemas: POS, facturación, banco, ERP, Excel o proveedores.

**Entregable:** matriz de reglas tributarias aprobada por el contador o asesor tributario.

### Fase 1: MVP operativo

Construir primero:

- Configuración de empresa y períodos.
- Proveedores/clientes.
- Registro manual de compras y ventas.
- Cálculo de base, IVA, total y clasificación fiscal.
- Libro de Compras.
- Libro de Ventas.
- Exportación Excel/PDF.
- Validaciones de duplicados y controles.
- Auditoría básica.
- Usuarios y roles.

**Objetivo:** reemplazar la transcripción manual de libros y controlar los totales.

### Fase 2: retenciones y resumen

Agregar:

- Motor de retención IVA.
- Generación consecutiva de comprobantes IVA.
- Motor parametrizable de ISLR.
- Generación de comprobantes ISLR.
- Resumen de IVA por período.
- Cierre de período.
- Gestión de anulación y corrección.
- Conciliaciones entre libros, comprobantes y resumen.

**Objetivo:** eliminar la duplicación entre libros, comprobantes y cálculo tributario.

### Fase 3: automatización e integraciones

Agregar según necesidad:

- Importación masiva desde Excel con vista previa de errores.
- Integración con POS, facturación, ERP o API externa.
- Carga OCR asistida de facturas, siempre con revisión humana.
- Portal para descarga de comprobantes por proveedores.
- Envío de comprobantes por correo.
- API interna o externa.
- Dashboard de obligaciones y alertas de cierre.
- Indicadores de IVA por período.
- Conciliación con declaraciones y pagos.
- Multiempresa para contadores o grupos empresariales.

**Objetivo:** disminuir el trabajo operativo, no solo digitalizarlo.

## Criterios de aceptación

El proyecto estará bien resuelto si se cumplen estos criterios:

- Una factura de compra se registra una vez y aparece correctamente en el Libro de Compras.
- Si corresponde, esa compra genera la retención IVA e ISLR aplicable según las reglas configuradas.
- El comprobante de retención se emite con un número único, datos trazables y valores conciliados.
- Una nota de crédito impacta el libro, el resumen y los montos asociados de forma consistente.
- El resumen de IVA coincide con la suma verificable de las operaciones del período.
- El usuario puede identificar, desde cualquier total, las facturas específicas que lo originaron.
- Ningún período cerrado cambia silenciosamente.
- Toda modificación posterior es auditable.
- Se puede reproducir un reporte histórico exactamente como fue emitido.
- Las reglas tributarias pueden cambiarse por vigencia, sin modificar registros ya cerrados.
- El contador puede exportar libros y soportes en un formato verificable.


## Riesgos que debes dejar claros

No presentes la aplicación como un sustituto de la asesoría contable o como un software que “declara automáticamente ante el SENIAT” a menos que se haya validado formalmente la integración y el alcance regulatorio.

Es mejor definirlo como:

> Sistema de apoyo tributario-contable para el registro, cálculo, control, emisión y generación de libros fiscales, resúmenes y comprobantes de retención, configurado de acuerdo con las reglas tributarias vigentes definidas y validadas por el responsable contable de la empresa.

Los porcentajes, conceptos, mínimos, sustraendos, exigencias documentales y calendarios deben quedar parametrizados y ser revisados periódicamente. La información publicada sobre el régimen de IVA muestra cambios regulatorios recientes, por lo que codificar reglas fijas sería un riesgo de mantenimiento y cumplimiento.[^1_6][^1_5]

## Propuesta de objetivo formal

Puedes plantear el objetivo general así:

> **Diseñar e implementar un sistema web de gestión tributaria y control documental que permita registrar operaciones de compra, venta, pago y retención; calcular y consolidar la información fiscal aplicable; y generar de forma automatizada, consistente y auditable los Libros de Compras, Libros de Ventas, resúmenes de IVA y comprobantes de retención de IVA e ISLR requeridos por la empresa, conforme a la normativa venezolana vigente y a las configuraciones validadas por su responsable contable.**

Y los objetivos específicos:

- Centralizar la información fiscal de compras, ventas, notas de crédito, notas de débito y pagos.
- Estandarizar la clasificación tributaria de las operaciones.
- Automatizar el cálculo de IVA, débitos, créditos, retenciones de IVA y retenciones de ISLR.
- Generar comprobantes con numeración consecutiva, trazabilidad y controles de integridad.
- Emitir libros fiscales y resúmenes consistentes con los documentos fuente.
- Facilitar revisiones, auditorías, cierres de período y respaldo documental.
- Reducir el tiempo operativo y los errores asociados a hojas de cálculo manuales.
- Permitir la actualización controlada de reglas tributarias por vigencia.

La clave del éxito no será replicar visualmente los Excel, sino convertir las reglas de negocio y tributarias en un flujo controlado: **registro → validación → cálculo → retención → emisión → consolidación → cierre → auditoría**.

<span style="display:none">[^1_11][^1_12][^1_13][^1_14][^1_15][^1_16]</span>

<div align="center">⁂</div>

[^1_1]: formatos_libro_de_compras_libro_de_ventas_resumen_comprobante_ret_de_islr_comprobante_de_retenc.xlsx

[^1_2]: https://www.mileoconsultores.com/wp-content/uploads/2017/06/Reglamento_Ley_de_IVA_1999-1.pdf

[^1_3]: https://docs.venezuela.justia.com/federales/providencias-administrativas/providencia-administrativa-mediante-la-cual-se-designan-a-los-contribuyentes-especiales-como-agentes-de-retencion-del-impuesto-al-valor-agregado.pdf

[^1_4]: https://www.mileoconsultores.com/blog/consultas-ejercicio-profesional/nuevo-comprobante-retencion-iva/

[^1_5]: https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/2025/nota-informativa-providencias-administrativas-de-retencion-de-iva.pdf

[^1_6]: https://alliottve.com/publicaciones/https-alliottve-com-snat-00054/

[^1_7]: https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/tabla-de-retenciones-del-islr-ut-43-2025.pdf

[^1_8]: https://naymaconsultores.com/quienes-deben-hacer-retenciones-de-islr-en-venezuela/

[^1_9]: https://gerenciaytributos.blogspot.com/2025/05/retencion-ISLR-facturas-de-servicios-y-ventas-no-asociadas.html

[^1_10]: https://naymaconsultores.com/8-claves-de-las-retenciones-de-islr-en-venezuela/

[^1_11]: https://venezuela.justia.com/federales/leyes/ley-que-establece-el-impuesto-al-valor-agregado/gdoc/

[^1_12]: https://es.scribd.com/doc/225276394/Decreto-1808-Sobre-Retenciones-de-ISLR

[^1_13]: http://basicodecontadores.blogspot.com/2017/06/libro-iva-compra-y-ventas-venezuela.html

[^1_14]: https://gerenciaytributos.blogspot.com/2025/08/no-se-exige-numero-de-providencia-administrativa-en-comprobante-de-retencion.html

[^1_15]: https://naymaconsultores.com/el-iva-quincenal-cambios-los-libros-de-compras-y-ventas/

[^1_16]: https://www.studocu.com/latam/document/universidad-del-zulia/derecho-laboral/articulos-de-lottt/96612772


---

# Soy full stack developer (nextjs tailwind postgres), no tengo el contexto, requiero que me ayude a comprender este sistema propuesto, dame algunos preliminares para lograr entender de que se trata

Este sistema es, en esencia, un **mini-ERP tributario venezolano**: recibe las operaciones comerciales de una empresa —compras, ventas, pagos, notas de crédito/débito— y produce automáticamente los documentos fiscales que hoy se llenan en Excel.

Para entenderlo como desarrollador, no empieces por “cómo generar cinco Excel/PDF”. Empieza por esta idea: **una empresa realiza transacciones; esas transacciones tienen consecuencias fiscales; el sistema clasifica, calcula, retiene y reporta esas consecuencias**.

Tu archivo es la salida final de ese proceso: Libro de Compras, Libro de Ventas, Resumen de IVA y comprobantes de retención de IVA e ISLR.[^2_1]

## La idea en lenguaje simple

Imagina que una empresa compra insumos a un proveedor:

- El proveedor emite una factura por 116.
- De esos 116, normalmente 100 corresponden al valor antes de IVA y 16 al IVA.
- La empresa registra esa compra.
- Si le corresponde actuar como agente de retención, puede retener una parte del IVA al proveedor.
- Si la operación está sujeta a ISLR, también podría retener un monto de impuesto sobre la renta.
- Al cierre del período, esa compra debe aparecer en el Libro de Compras.
- El IVA de la compra podría servir como crédito fiscal frente al IVA cobrado en ventas.
- La retención genera uno o más comprobantes que se entregan al proveedor.

La aplicación debe hacer que esos resultados se generen desde un único registro de compra, sin volver a escribir los datos manualmente en cada formato.

```text
Factura de compra
       ↓
Registro de compra
       ↓
Reglas fiscales aplicables
       ├── Libro de Compras
       ├── Retención IVA, si aplica
       ├── Retención ISLR, si aplica
       └── Resumen de IVA del período
```

La misma lógica existe para una venta:

```text
Factura o reporte Z de venta
       ↓
Registro de venta
       ↓
Cálculo de base imponible + IVA
       ↓
Libro de Ventas
       ↓
Resumen de IVA del período
```


## Conceptos esenciales

Antes de pensar en base de datos, necesitas tener claro qué significa cada término.


| Concepto | Explicación práctica | Cómo se modela |
| :-- | :-- | :-- |
| IVA | Impuesto al Valor Agregado. Se cobra al vender y se paga al comprar bienes/servicios gravados | Impuesto asociado a una línea o documento fiscal |
| Débito fiscal | IVA que la empresa cobra a sus clientes en sus ventas | Se origina en ventas |
| Crédito fiscal | IVA que la empresa paga a proveedores en compras que dan derecho a crédito | Se origina en compras |
| Base imponible | Monto sobre el cual se calcula el impuesto, normalmente antes de IVA | `subtotal_gravado` |
| Alícuota | Porcentaje de IVA aplicable a la base; debe ser configurable por vigencia | `tax_rate` o regla tributaria |
| Factura | Documento que soporta una compra o venta | Documento fiscal principal |
| Número de control | Identificador fiscal adicional de la factura usado en Venezuela | Campo fiscal obligatorio según el tipo de documento |
| Nota de crédito | Documento que disminuye o revierte total/parcialmente una factura previa | Ajuste negativo vinculado a un documento original |
| Nota de débito | Documento que incrementa el monto de una operación previa | Ajuste positivo vinculado a un documento original |
| Libro de Compras | Registro cronológico de facturas y documentos de compras | Reporte derivado de compras |
| Libro de Ventas | Registro cronológico de las ventas del período | Reporte derivado de ventas |
| Retención | Monto que una parte descuenta a otra y luego entera/declara según las reglas aplicables | Evento tributario, no solo un descuento financiero |
| Agente de retención | Empresa obligada o designada para practicar una retención | Perfil tributario de la empresa |
| Comprobante de retención | Documento que prueba que se practicó una retención | Documento fiscal emitido por el sistema |
| Período fiscal | Intervalo que se está declarando/controlando, normalmente mensual o según calendario aplicable | Entidad de cierre y consolidación |

La Ley y el Reglamento de IVA exigen llevar los libros de compras y ventas y preparar resúmenes que distingan operaciones gravadas, exentas/no gravadas, exportaciones y operaciones por alícuota. Por eso las hojas no son solo reportes administrativos: son soportes tributarios.[^2_2]

## Qué representan los formatos

El Excel adjunto sirve como mapa funcional inicial. Cada hoja representa una salida del sistema, no necesariamente una tabla de la base de datos.


| Hoja del archivo | Qué responde | De dónde sale en el sistema |
| :-- | :-- | :-- |
| Libro de Compras | “¿Qué compró la empresa y qué IVA soportó en el período?” | Facturas de proveedores, importaciones, notas de crédito/débito y retenciones |
| Libro de Ventas | “¿Qué vendió la empresa y cuánto IVA cobró?” | Facturas de clientes, reportes Z, notas de crédito/débito y ajustes |
| Resumen | “¿Cuál es el resultado fiscal de IVA del período?” | Consolidación de compras, ventas, saldos anteriores, ajustes y retenciones |
| Comprobante de Retención IVA | “¿Cuánto IVA se retuvo a este proveedor por estas facturas?” | Retenciones IVA vinculadas a compras |
| Comprobante de Retención ISLR | “¿Cuánto ISLR se retuvo a este proveedor o beneficiario?” | Retenciones ISLR vinculadas a pagos/abonos y conceptos gravados |

El Libro de Compras de la plantilla tiene campos como RIF, razón social, número de comprobante de retención, número de factura, número de control, tipo de transacción, total con IVA, compras sin derecho a crédito fiscal, base imponible, alícuota, IVA causado e IVA retenido.[^2_1]

El Libro de Ventas contiene estructura equivalente para ventas, incluyendo RIF del cliente, comprobante, reporte Z, rangos de factura, número de control, notas de débito/crédito, ventas exentas, cobros por cuenta de terceros, base imponible, alícuota, IVA causado e IVA retenido.[^2_1]

El “Resumen” toma los totales de ambos libros y los transforma en una vista de determinación del impuesto: débitos fiscales, créditos fiscales, ajustes, excedentes y retenciones aplicables.[^2_1]

## La lógica contable mínima

No necesitas convertirte en contador para construir una primera versión, pero sí comprender el flujo básico.

### Caso: venta gravada

La empresa vende un producto o servicio por 100 antes de IVA, y la alícuota aplicable es 16%.

$$
\text{Base imponible} = 100
$$

$$
\text{IVA causado} = 100 \times 0.16 = 16
$$

$$
\text{Total factura} = 100 + 16 = 116
$$

La empresa cobra 116 al cliente:

- 100 pertenecen a la venta.
- 16 son IVA cobrado al cliente.
- Esos 16 se convierten en **débito fiscal** para la empresa.

En el sistema:

```json
{
  "type": "sale_invoice",
  "customer": "Cliente X",
  "taxable_base": 100.00,
  "vat_rate": 0.16,
  "vat_amount": 16.00,
  "total": 116.00,
  "tax_category": "internal_general_rate"
}
```

Esa venta alimenta el Libro de Ventas y el bloque de débitos fiscales del resumen.

### Caso: compra gravada

La empresa compra un servicio o mercancía por 100 más IVA:

$$
\text{Base imponible} = 100
$$

$$
\text{IVA soportado} = 16
$$

$$
\text{Total factura} = 116
$$

En el sistema:

```json
{
  "type": "purchase_invoice",
  "supplier": "Proveedor Y",
  "taxable_base": 100.00,
  "vat_rate": 0.16,
  "vat_amount": 16.00,
  "total": 116.00,
  "tax_category": "internal_general_rate"
}
```

Si esa compra permite crédito fiscal, los 16 representan el **crédito fiscal** de la empresa.

### Determinación básica del IVA

Al final del período:

$$
\text{IVA neto} =
\text{Débitos fiscales de ventas}
-
\text{Créditos fiscales de compras}
$$

Ejemplo:

```text
IVA cobrado en ventas:      160
IVA pagado en compras:      100
--------------------------------
IVA neto preliminar:         60
```

Si existen retenciones aplicables, excedentes del período anterior o ajustes, intervienen después según las reglas configuradas.

En lenguaje simple:

- La empresa cobra IVA cuando vende.
- La empresa paga IVA cuando compra.
- El sistema calcula la diferencia bajo las reglas fiscales aplicables.
- El resumen del Excel intenta documentar esa diferencia.[^2_1]


## Retenciones: el punto más importante

Las retenciones suelen ser lo más confuso al inicio porque existen dos conceptos distintos.

### Retención de IVA

Supón que compras a un proveedor por:

```text
Base:                 100
IVA:                   16
Total factura:        116
```

Si la empresa actúa como agente de retención y la regla aplicable establece una retención del 75% del IVA:

$$
\text{IVA retenido} = 16 \times 0.75 = 12
$$

Entonces:

```text
Total de factura:                  116
Menos IVA retenido:                 12
Monto pagado al proveedor:         104
```

El proveedor recibe 104, pero obtiene un comprobante que prueba que se le retuvieron 12 de IVA. La empresa que retuvo debe reflejar la operación según sus obligaciones ante el SENIAT.

Lo importante técnicamente:

- La retención **no es otra factura**.
- No debe ser solo una columna editable.
- Es un evento tributario vinculado a una compra concreta.
- Puede ocurrir al pagar o conforme al momento de retención definido en la regla aplicable.
- Requiere su propio comprobante con numeración.
- Puede afectar una o varias facturas, dependiendo del flujo permitido.
- Debe ser reversible/anulable de manera controlada, no editable silenciosamente.

El comprobante de IVA del archivo contiene los datos del agente, proveedor, fecha, número de comprobante, factura, número de control, total de la compra, base imponible, IVA causado, porcentaje retenido y monto retenido.[^2_1]

Las referencias sobre providencias de retención destacan que los regímenes pueden cambiar y que los porcentajes pueden variar según el supuesto. Por eso el porcentaje de retención debe configurarse por regla y vigencia, no estar “hardcodeado” en el frontend o backend.[^2_2]

### Retención de ISLR

La retención de ISLR es distinta: no se calcula necesariamente sobre el IVA, sino sobre una **base de renta o pago sujeto a retención**, según el tipo de operación.

Ejemplo simplificado de servicio:

```text
Monto sujeto:          100
Porcentaje ISLR:         2 %
Sustraendo:              0
----------------------------
ISLR retenido:           2
```

$$
\text{ISLR retenido}
=
(\text{Base sujeta} \times \text{Porcentaje})
-
\text{Sustraendo}
$$

En el ejemplo del Excel, el comprobante incluye factura, número de control, monto total, concepto de pago, base imponible, porcentaje, sustraendo y monto retenido.[^2_1]

El Decreto 1.808 regula las retenciones de ISLR y contempla que los agentes de retención deben entregar un comprobante por cada retención practicada.[^2_3]

Para ti, como arquitecto del sistema, la consecuencia es clara: necesitas un **catálogo de conceptos de retención de ISLR**. Por ejemplo:

```text
Servicios
Honorarios profesionales
Comisiones
Arrendamientos
Intereses
Publicidad
Transporte
Pagos a no residentes
Otros conceptos configurables
```

Cada concepto puede tener su propia regla, porcentaje, sustraendo, base y vigencia. No deberías programar una regla universal de “ISLR = 2%”.

## Ejemplo completo

Un flujo compacto te ayudará a unir las piezas.

### Escenario

La empresa compra un servicio de diseño a “Proveedor ABC, C.A.”:

```text
Servicio antes de IVA:                  1.000,00
IVA:                                      160,00
Total factura:                          1.160,00
Retención de IVA: 75 % del IVA:          120,00
Retención de ISLR: 2 % sobre base:        20,00
Monto pagado al proveedor:              1.020,00
```

Cálculos:

$$
\text{IVA} = 1.000 \times 0.16 = 160
$$

$$
\text{Retención IVA} = 160 \times 0.75 = 120
$$

$$
\text{Retención ISLR} = 1.000 \times 0.02 = 20
$$

$$
\text{Pago neto} = 1.160 - 120 - 20 = 1.020
$$

### Lo que hace el sistema

1. Registra la factura de compra.
2. Calcula y guarda su base, IVA, total y clasificación tributaria.
3. La incorpora al Libro de Compras.
4. Evalúa si aplica retención de IVA.
5. Evalúa si aplica retención de ISLR de acuerdo con el concepto “servicio”.
6. Genera el comprobante de retención IVA.
7. Genera el comprobante de retención ISLR.
8. Registra el pago neto al proveedor.
9. Al cerrar el período, usa la compra para consolidar el resumen tributario.
```text
purchase_document
       │
       ├── purchase_tax_summary
       ├── iva_withholding
       │      └── iva_withholding_certificate
       ├── islr_withholding
       │      └── islr_withholding_certificate
       └── payment / payment_allocation
```

El ejemplo es didáctico, no una instrucción tributaria definitiva: si aplica IVA, si hay retención, el porcentaje y la base deben depender de la condición real de las partes y de reglas vigentes validadas con un contador.

## Cómo traducirlo a módulos

Piensa en el sistema como seis módulos conectados, no como cinco reportes.


| Módulo | Pregunta de negocio | Entidades principales |
| :-- | :-- | :-- |
| Configuración fiscal | “¿Quién es la empresa y qué reglas le aplican?” | `companies`, `tax_profiles`, `tax_rates`, `withholding_rules`, `document_series` |
| Terceros | “¿Con quién compra o vende la empresa?” | `parties`, `party_addresses`, `party_tax_profiles` |
| Documentos de compra | “¿Qué se compró, a quién y bajo qué condiciones?” | `purchase_documents`, `purchase_document_lines`, `fiscal_adjustments` |
| Documentos de venta | “¿Qué se vendió y cuánto IVA se generó?” | `sales_documents`, `sales_document_lines`, `z_reports` |
| Retenciones y pagos | “¿Qué se retuvo y cuánto se pagó realmente?” | `payments`, `payment_allocations`, `iva_withholdings`, `islr_withholdings` |
| Reportes y cierre | “¿Qué se declara/documenta en este período?” | `fiscal_periods`, `fiscal_closures`, `generated_reports`, `audit_events` |

## Modelo de datos mental

La relación esencial podría verse así:

```text
Empresa
  ├── Períodos fiscales
  ├── Series de comprobantes
  ├── Reglas tributarias por vigencia
  ├── Clientes y proveedores
  │
  ├── Compras
  │     ├── Líneas / bases gravadas / exentas
  │     ├── Nota de crédito o débito asociada
  │     ├── Retención IVA
  │     ├── Retención ISLR
  │     └── Pagos
  │
  └── Ventas
        ├── Líneas / bases gravadas / exentas
        ├── Nota de crédito o débito asociada
        └── Reporte Z si aplica
```

Una compra no debe guardar directamente “el Excel del Libro de Compras”. El libro se genera desde las compras del período.

Una retención no debe ser apenas una columna como `iva_retained`. Debe ser una entidad con:

```text
withholding
- id
- company_id
- type: IVA | ISLR
- status: draft | issued | delivered | voided
- issued_at
- delivered_at
- certificate_number
- supplier_id
- rule_version_id
- total_amount
- issued_by
- voided_at
- void_reason
```

Y una tabla de líneas:

```text
withholding_lines
- withholding_id
- purchase_document_id
- invoice_number
- control_number
- taxable_base
- vat_amount
- retention_rate
- subtracting_amount
- retained_amount
```

Esto permite que un comprobante incluya varias facturas y que cada cálculo conserve sus datos históricos.

## Qué debes investigar primero

No intentes entender todas las leyes de una vez. Haz un levantamiento ordenado con el cliente y su contador.

### Preguntas de negocio

- ¿El sistema será para una empresa o para múltiples empresas?
- ¿Quiénes serán los usuarios: administrativo, contador, auditor, proveedores?
- ¿Las compras y ventas se cargarán manualmente, por Excel o desde un sistema existente?
- ¿Existe un POS, sistema de facturación, máquina fiscal, ERP o software contable?
- ¿Se manejan sucursales, cajas o múltiples establecimientos?
- ¿Se requiere facturación electrónica, o solo libros y retenciones?
- ¿El cliente requiere PDF, Excel o ambos?
- ¿Los proveedores necesitan descargar sus comprobantes desde un portal?
- ¿Se enviarán comprobantes por correo?
- ¿Cuántas facturas procesa al mes?
- ¿Qué volumen histórico debe migrarse?


### Preguntas tributarias

Estas deben responderlas el contador o asesor tributario del cliente:

- ¿La empresa es contribuyente ordinario de IVA?
- ¿Es contribuyente especial?
- ¿Está formalmente designada como agente de retención de IVA?
- ¿Está obligada a practicar retenciones de ISLR?
- ¿Qué alícuotas de IVA aplica realmente?
- ¿Qué tipos de compras y ventas realiza?
- ¿Emite facturas, reportes Z, notas de crédito y notas de débito?
- ¿Qué conceptos de pago generan retención de ISLR?
- ¿Qué criterios usan para calcular la base de cada retención?
- ¿En qué momento se practica la retención: factura, pago, abono en cuenta u otro evento?
- ¿Qué calendario de declaración/aplicación deben atender?
- ¿Cómo numeran actualmente los comprobantes?
- ¿Qué política de anulación, sustitución y corrección usan?
- ¿Qué formatos debe aceptar el contador como salida final?

El sistema debe implementar las reglas aprobadas por el especialista; no debe “inventar” la interpretación legal. La regulación de IVA requiere el mantenimiento de libros y resúmenes, mientras que la de ISLR exige soporte documental de las retenciones practicadas.[^2_3][^2_2]

## Alcance de un MVP

Para no convertir esto en un ERP imposible, el primer alcance debería ser pequeño, explícito y útil.

### Incluye

- Una sola empresa.
- Usuarios internos con roles básicos.
- Registro manual de proveedores y clientes.
- Carga manual e importación desde Excel de compras y ventas.
- Facturas, notas de crédito y notas de débito.
- Configuración de alícuotas de IVA.
- Clasificación fiscal de compras y ventas.
- Libro de Compras.
- Libro de Ventas.
- Resumen tributario de IVA.
- Emisión de comprobantes de retención IVA.
- Emisión de comprobantes de retención ISLR.
- Numeración consecutiva por tipo de comprobante.
- Exportación Excel y PDF.
- Cierre de período.
- Historial básico de cambios.
- Adjuntar soportes de las facturas.


### Excluye inicialmente

- Declaración automática ante SENIAT.
- Contabilidad financiera completa: cuentas contables, asientos, mayor general, balance, estado de resultados.
- Nómina.
- Inventario.
- Facturación electrónica propia.
- Integraciones bancarias.
- OCR autónomo de facturas.
- Multiempresa.
- Portal de proveedores.
- Automatización avanzada con IA.

Con ese alcance puedes validar el modelo, reducir el trabajo de Excel y obtener retroalimentación del contador antes de incorporar integraciones complejas.

## Flujo de pantalla sugerido

Una primera experiencia de usuario podría ser así:

```text
Dashboard
  ├── Período activo: septiembre 2026
  ├── Estado: abierto / en revisión / cerrado
  ├── Compras pendientes de validar
  ├── Retenciones pendientes de emitir
  └── Alertas de inconsistencias

Compras
  ├── Listado
  ├── Nueva compra
  ├── Importar Excel
  └── Ver documento + soporte

Venta
  ├── Listado
  ├── Nueva venta
  ├── Importar Excel
  └── Reportes Z

Retenciones
  ├── IVA pendientes
  ├── ISLR pendientes
  ├── Emitidas
  └── Anuladas

Reportes
  ├── Libro de Compras
  ├── Libro de Ventas
  ├── Resumen de IVA
  └── Exportar PDF / Excel

Configuración
  ├── Empresa
  ├── Períodos
  ├── Alícuotas
  ├── Reglas de retención
  ├── Conceptos ISLR
  └── Series de comprobantes
```


## Orden de aprendizaje recomendado

1. **Lee el Excel como una salida fiscal**, no como la fuente de datos.
2. **Aprende el ciclo compra → retención → pago → libro → resumen.**
3. **Aprende el ciclo venta → IVA cobrado → libro → resumen.**
4. Identifica junto al contador cuáles son las categorías de operaciones reales del cliente.
5. Diseña el modelo de documentos fuente y ajustes.
6. Diseña el motor de reglas con vigencias y configuración.
7. Implementa reportes solo cuando las entidades y cálculos ya estén correctos.
8. Agrega cierre y auditoría antes de entregar una versión productiva.
9. Integra importaciones o sistemas externos después de validar la operación manual.
10. Finalmente, automatiza tareas repetitivas con IA/OCR, pero siempre con revisión humana.

La frase que te conviene mantener como brújula técnica es esta:

> **El sistema no registra “libros”; registra hechos económicos y fiscales, y desde ellos construye libros, retenciones, comprobantes y resúmenes.**

Ese enfoque evitará que termines construyendo un generador de plantillas Excel sin control, trazabilidad ni utilidad real.

<span style="display:none">[^2_10][^2_11][^2_12][^2_13][^2_14][^2_15][^2_16][^2_4][^2_5][^2_6][^2_7][^2_8][^2_9]</span>

<div align="center">⁂</div>

[^2_1]: formatos_libro_de_compras_libro_de_ventas_resumen_comprobante_ret_de_islr_comprobante_de_retenc.xlsx

[^2_2]: https://es.scribd.com/document/518036540/forma-72-1

[^2_3]: https://www.cidtct.uc.edu.ve/wp-content/uploads/2025/05/Decreto-1808-ISLR.pdf

[^2_4]: https://www.moore-venezuela.com/wp-content/uploads/sites/15/2025/12/tabla-de-retenciones.pdf

[^2_5]: https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/2025/nota-informativa-providencias-administrativas-de-retencion-de-iva.pdf

[^2_6]: https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/tabla-de-retenciones-del-islr-ut-43-2025.pdf

[^2_7]: https://docs.venezuela.justia.com/federales/providencias-administrativas/providencia-administrativa-mediante-la-cual-se-designan-a-los-contribuyentes-especiales-como-agentes-de-retencion-del-impuesto-al-valor-agregado.pdf

[^2_8]: https://es.scribd.com/doc/225276394/Decreto-1808-Sobre-Retenciones-de-ISLR

[^2_9]: https://www.mileoconsultores.com/wp-content/uploads/2017/06/Reglamento_Ley_de_IVA_1999-1.pdf

[^2_10]: https://gerenciaytributos.blogspot.com/2025/08/no-se-exige-numero-de-providencia-administrativa-en-comprobante-de-retencion.html

[^2_11]: https://alliottve.com/publicaciones/https-alliottve-com-snat-00054/

[^2_12]: https://naymaconsultores.com/el-iva-quincenal-cambios-los-libros-de-compras-y-ventas/

[^2_13]: https://naymaconsultores.com/8-claves-de-las-retenciones-de-islr-en-venezuela/

[^2_14]: http://basicodecontadores.blogspot.com/2017/06/libro-iva-compra-y-ventas-venezuela.html

[^2_15]: https://gerenciaytributos.blogspot.com/2025/05/retencion-ISLR-facturas-de-servicios-y-ventas-no-asociadas.html

[^2_16]: https://www.mileoconsultores.com/blog/consultas-ejercicio-profesional/nuevo-comprobante-retencion-iva/


---

# Replanteamiento del sistema

Con las respuestas obtenidas, **ERP-TributarioLite** será una aplicación web multiempresa para registrar operaciones fiscales, importar compras y ventas mediante CSV, calcular retenciones y generar libros y comprobantes en PDF y Excel.

La primera versión no será un ERP contable completo ni un sistema de facturación. Será una capa tributaria que recibe información manual o importada desde CSV, complementa el software contable legacy y usa los datos de la máquina fiscal para generar reportes fiscales consistentes.

```text
Software contable legacy ─┐
                          ├── CSV ──> ERP-TributarioLite ──> Libros y retenciones
Máquina fiscal / reportes ┘                         ├── PDF
                                                   └── Excel
```

El alcance debe considerar aproximadamente entre 100 y 200 facturas mensuales y una migración inicial de un volumen similar. La aplicación debe admitir empresas, usuarios, períodos fiscales, sucursales opcionales y roles diferenciados.

La normativa venezolana exige mantener registros de compras y ventas y preparar resúmenes por período, separando operaciones según su tratamiento fiscal y alícuota. Además, los comprobantes de retención de IVA requieren numeración consecutiva, datos del agente y proveedor, documento afectado, base, impuesto causado y monto retenido.[^3_1][^3_2]

# Preguntas tributarias

Estas preguntas deben ser respondidas por el contador o asesor tributario del cliente. No son simples preguntas de configuración técnica: determinan cómo se calculan los impuestos y qué documentos debe producir el sistema.

## Perfil fiscal de cada empresa

Para cada empresa registrada en el sistema, confirmar:

1. ¿Es contribuyente ordinario de IVA?
2. ¿Es contribuyente especial?
3. ¿Es agente de retención de IVA?
4. ¿Es agente de retención de ISLR?
5. ¿Tiene varias actividades económicas con tratamientos fiscales diferentes?
6. ¿Tiene una o varias sucursales o establecimientos?
7. ¿Cada sucursal utiliza una numeración, caja o máquina fiscal diferente?
8. ¿La empresa trabaja con varias cuentas bancarias o formas de pago que deban registrarse?
9. ¿La condición fiscal cambia entre empresas del grupo?
10. ¿Hay empresas con reglas de retención distintas dentro de la misma instalación?

Estas respuestas deben almacenarse por empresa y no como una configuración global del sistema.

## Períodos fiscales

Hay que precisar:

1. ¿Los libros se generan mensualmente, quincenalmente o bajo ambos esquemas?
2. ¿La retención de IVA se calcula considerando la fecha de factura, fecha de recepción, fecha de pago o fecha de abono en cuenta?
3. ¿Cuál es la fecha de corte de cada período?
4. ¿Qué calendario de declaración y pago se utiliza?
5. ¿Qué ocurre con una factura recibida después del cierre?
6. ¿Se permite reabrir un período cerrado?
7. ¿Quién puede autorizar una reapertura?
8. ¿Cómo se registran los ajustes de períodos anteriores?
9. ¿Cómo se trata una factura de un período anterior que se importa posteriormente?
10. ¿Qué fecha determina la inclusión de una nota de crédito o débito?

El sistema debe diferenciar al menos:

```text
fecha del documento
fecha de recepción
fecha del pago
fecha de retención
fecha de emisión del comprobante
fecha de entrega del comprobante
fecha del período fiscal
```

No siempre estas fechas son iguales.

## Reglas de IVA

Confirmar:

1. ¿Qué alícuotas de IVA utiliza cada empresa?
2. ¿Se manejan operaciones exentas?
3. ¿Se manejan operaciones exoneradas?
4. ¿Se manejan operaciones no sujetas?
5. ¿Se manejan exportaciones?
6. ¿Se manejan importaciones?
7. ¿Se utiliza una alícuota adicional?
8. ¿Se manejan operaciones con derecho parcial o sin derecho a crédito fiscal?
9. ¿Cómo se clasifican las compras de uso mixto?
10. ¿Cómo se registra un ajuste de crédito fiscal de períodos anteriores?
11. ¿Cómo se calcula el excedente de crédito fiscal?
12. ¿Cómo se registran las ventas por cuenta de terceros?
13. ¿Cómo se redondean los importes?
14. ¿El redondeo ocurre por línea, documento o total del período?

El artículo 72 del Reglamento de la Ley de IVA contempla que los resúmenes indiquen bases imponibles, impuesto, débito fiscal, crédito fiscal, operaciones exentas/no sujetas, exportaciones y separación por alícuotas.[^3_1]

## Retención de IVA

Confirmar con precisión:

1. ¿Qué empresas están autorizadas u obligadas a retener IVA?
2. ¿Qué tipos de proveedores están sujetos a retención?
3. ¿Qué operaciones están excluidas?
4. ¿Qué porcentaje se utiliza para cada supuesto?
5. ¿Existe retención del 75%, 100% u otros porcentajes según el caso?
6. ¿Qué mínimo, límite o condición de aplicación se utiliza?
7. ¿La retención se aplica sobre el IVA causado o sobre otra base?
8. ¿Cómo se tratan notas de crédito?
9. ¿Cómo se tratan notas de débito?
10. ¿Qué sucede si la factura tiene partidas gravadas y no gravadas?
11. ¿Se permite un comprobante con varias facturas?
12. ¿La numeración es global, por empresa, sucursal o período?
13. ¿Quién puede emitir el comprobante?
14. ¿Quién puede anularlo?
15. ¿Cómo se documenta una retención corregida?
16. ¿Cómo se controla la fecha máxima de entrega al proveedor?

La providencia publicada en 2025 establece, entre otros elementos, numeración de 14 caracteres en formato `AAAAMMSSSSSSSS`, datos del agente y proveedor, factura, número de control, monto total, base imponible, impuesto causado y monto retenido. También indica que el comprobante debe entregarse dentro del plazo correspondiente al período siguiente.[^3_2]

Por tanto, la numeración debe ser una entidad controlada por base de datos:

```text
20260900000001
20260900000002
20260900000003
```

No debe generarse únicamente en el frontend ni mediante `MAX(numero) + 1`, porque eso puede producir duplicados si dos usuarios emiten comprobantes simultáneamente.

## Retención de ISLR

Confirmar:

1. ¿Qué conceptos de pago generan retención?
2. ¿Se retiene a personas naturales?
3. ¿Se retiene a personas jurídicas?
4. ¿Se retiene por servicios profesionales?
5. ¿Se retiene por publicidad, comisiones, alquileres, transporte u otros conceptos?
6. ¿Qué base se utiliza en cada concepto?
7. ¿Qué porcentaje corresponde?
8. ¿Existe sustraendo?
9. ¿Cómo se calcula la retención cuando hay varios conceptos en una factura?
10. ¿La retención ocurre al pagar o al abonar en cuenta?
11. ¿Se generan comprobantes individuales por pago?
12. ¿Se necesita comprobante acumulado anual?
13. ¿Qué sucede con pagos parciales?
14. ¿Cómo se registran anulaciones o devoluciones?
15. ¿Qué datos exige el contador en el comprobante?

El Decreto 1.808 establece la obligación de entregar un comprobante por cada retención, incluyendo información sobre el monto pagado o abonado en cuenta y la cantidad retenida.[^3_3]

El sistema debe manejar las reglas de ISLR como configuraciones versionadas:

```text
Concepto: Servicios profesionales
Base: monto sujeto configurado
Porcentaje: configurado
Sustraendo: configurado
Vigencia: desde / hasta
Condiciones: tipo de beneficiario y operación
```

No conviene programar una fórmula fija del tipo:

```text
retención ISLR = total factura * 2 %
```


## Tratamiento de la máquina fiscal

Como existe una máquina fiscal, hay que aclarar:

1. ¿La máquina fiscal produce reportes Z diarios?
2. ¿Los reportes Z se importarán mediante CSV?
3. ¿Se registrarán las ventas individualmente o resumidas por reporte Z?
4. ¿El archivo incluye número inicial y final de facturas?
5. ¿Incluye número de control?
6. ¿Incluye ventas exentas y gravadas separadas?
7. ¿Incluye notas de crédito y débito?
8. ¿Se manejan varias máquinas fiscales?
9. ¿Cada máquina pertenece a una sucursal?
10. ¿Se requiere validar que no haya saltos en la numeración?
11. ¿Qué información se toma como fuente principal: máquina fiscal, software legacy o carga manual?
12. ¿Cómo se resolverán diferencias entre el reporte Z y el CSV?

Esto es importante porque el Libro de Ventas podría alimentarse de facturas individuales o de resúmenes de ventas de la máquina fiscal. El sistema debe soportar ambos modos, pero definir cuál se utilizará en cada empresa.

## Importación desde CSV

Las preguntas técnicas y tributarias deben combinarse:

1. ¿Quién define el formato de cada CSV?
2. ¿El software legacy puede exportar columnas estables?
3. ¿La máquina fiscal produce un formato diferente?
4. ¿Los archivos tienen separador coma, punto y coma o tabulador?
5. ¿Usan coma o punto decimal?
6. ¿Cómo vienen las fechas?
7. ¿Los RIF tienen guiones?
8. ¿Los campos vacíos se representan como `0`, vacío, `N/A` o asteriscos?
9. ¿Existe un identificador único por documento?
10. ¿Los CSV contienen el número de control?
11. ¿Los documentos ya incluyen la retención calculada?
12. ¿El sistema debe recalcularla?
13. ¿Qué pasa si el cálculo importado no coincide con la regla vigente?
14. ¿Se rechaza el archivo completo o solo las filas inválidas?
15. ¿Se necesita una plantilla CSV por empresa o un formato común?
16. ¿Cómo se corrige una fila rechazada?
17. ¿Se desea conservar el archivo original importado?

La importación debe tener una etapa intermedia:

```text
Archivo CSV
   ↓
Carga temporal
   ↓
Mapeo de columnas
   ↓
Validación
   ↓
Vista previa de errores
   ↓
Confirmación del usuario
   ↓
Registros fiscales definitivos
```

No debes insertar directamente cada fila del CSV en `purchase_documents` o `sales_documents`.

# Alcance de un MVP

El MVP debe centrarse en resolver el problema actual: centralizar información fiscal de varias empresas, importar documentos, calcular retenciones y generar libros y comprobantes.

## Objetivo del MVP

> Permitir que usuarios administrativos registren e importen operaciones de compras y ventas para múltiples empresas, que contadores validen y cierren períodos, que auditores consulten información trazable y que proveedores consulten únicamente los comprobantes que les correspondan en el ámbito interno definido para esta primera versión, generando libros y comprobantes en PDF y Excel.

La parte de proveedores debe aclararse: en las respuestas se indica que no habrá portal de proveedores en la versión 1. Por tanto, los proveedores pueden existir como terceros registrados y sus datos pueden aparecer en los comprobantes, pero no tendrán cuentas para iniciar sesión ni descargar documentos desde un portal.

## Empresas y aislamiento de datos

El MVP debe ser multiempresa desde el primer día.

Cada registro operativo debe pertenecer a una empresa:

```text
company_id
```

Pero no es suficiente agregar solo una columna. También debes definir:

- Qué usuarios tienen acceso a cada empresa.
- Si un contador puede ver todas las empresas.
- Si un administrativo solo puede ver una empresa.
- Si un auditor tiene acceso de lectura a una o varias empresas.
- Si las reglas tributarias son globales o propias de cada empresa.
- Si las numeraciones son independientes.
- Si los períodos se cierran por empresa.
- Si las sucursales se manejan dentro de la empresa.

Una estructura inicial sería:

```text
users
companies
company_user
roles
permissions
branches
fiscal_periods
document_series
```

La regla principal de seguridad será:

```text
Un usuario solo puede consultar o modificar registros de empresas a las que tenga acceso explícito.
```


## Roles iniciales

| Rol | Responsabilidades |
| :-- | :-- |
| Administrador del sistema | Gestiona usuarios, empresas, permisos y parámetros generales |
| Administrativo | Importa CSV, registra documentos, corrige errores y prepara operaciones |
| Contador | Valida cálculos, configura reglas tributarias, revisa reportes y cierra períodos |
| Auditor | Consulta documentos, reportes, versiones y bitácora sin modificar información |
| Proveedor | No tendrá acceso al portal en el MVP; se reserva para la versión 2 |

El rol proveedor puede existir en el diseño de autorización para evitar una migración posterior, pero su portal debe mantenerse desactivado en la versión 1.

## Módulos incluidos

### 1. Gestión multiempresa

Incluye:

- Registro de empresas.
- Razón social.
- RIF.
- Dirección fiscal.
- Condición tributaria.
- Agente de retención IVA.
- Agente de retención ISLR.
- Configuración de alícuotas.
- Configuración de períodos.
- Sucursales opcionales.
- Usuarios asociados.
- Estado activo/inactivo.


### 2. Usuarios y permisos

Incluye:

- Inicio de sesión.
- Recuperación de acceso.
- Roles.
- Permisos por módulo.
- Acceso por empresa.
- Restricción de edición por estado del período.
- Registro del usuario que creó, validó, emitió o cerró una operación.


### 3. Catálogo de terceros

Incluye:

- Clientes.
- Proveedores.
- RIF.
- Razón social.
- Dirección fiscal.
- Tipo de persona.
- Condición de retención.
- Conceptos de ISLR aplicables.
- Historial de cambios.
- Estado activo/inactivo.


### 4. Importación de compras y ventas mediante CSV

Incluye:

- Plantillas CSV descargables.
- Carga de archivo.
- Detección de separador.
- Mapeo de columnas.
- Validación de fechas.
- Validación de RIF.
- Validación de números de factura.
- Validación de números de control.
- Validación de importes.
- Validación de alícuotas.
- Validación de documentos duplicados.
- Vista previa de errores.
- Confirmación de importación.
- Registro del archivo original.
- Informe de filas importadas y rechazadas.


### 5. Registro manual

Aunque la entrada principal será CSV, el MVP debe permitir crear manualmente:

- Compras.
- Ventas.
- Notas de crédito.
- Notas de débito.
- Ajustes.
- Retenciones.
- Proveedores y clientes.

Esto será necesario para corregir errores, registrar excepciones y completar documentos que no lleguen desde el legacy.

### 6. Compras

Incluye:

- Facturas de proveedores.
- Notas de crédito.
- Notas de débito.
- Compras gravadas.
- Compras exentas/no sujetas.
- Compras sin derecho a crédito fiscal.
- Importaciones si el cliente las utiliza.
- Número de factura.
- Número de control.
- Fecha del documento.
- Proveedor.
- Base imponible.
- IVA.
- Total.
- IVA retenido.
- ISLR retenido.
- Documento afectado.
- Sucursal opcional.
- Soporte adjunto.


### 7. Ventas

Incluye:

- Facturas.
- Reportes Z.
- Notas de crédito.
- Notas de débito.
- Ventas gravadas.
- Ventas exentas/no sujetas.
- Ventas por cuenta de terceros, si aplica.
- Exportaciones, si aplica.
- Cliente.
- Número de factura.
- Número de control.
- Fecha.
- Base imponible.
- IVA.
- Total.
- Retención registrada, si aplica.
- Máquina fiscal y sucursal, cuando corresponda.


### 8. Retenciones de IVA

Incluye:

- Configuración de reglas.
- Identificación de compras sujetas.
- Cálculo de monto retenido.
- Retención parcial o total según regla.
- Asociación a factura o nota de débito.
- Comprobantes con una o varias líneas.
- Numeración consecutiva.
- Fecha de emisión.
- Fecha de entrega.
- Estado del comprobante.
- PDF.
- Excel.
- Anulación controlada.
- Historial de cambios.
- Consulta por proveedor, período y empresa.


### 9. Retenciones de ISLR

Incluye:

- Catálogo de conceptos.
- Reglas por concepto.
- Porcentaje.
- Sustraendo.
- Base de cálculo.
- Beneficiario.
- Factura o soporte de pago.
- Monto pagado o abonado.
- Monto retenido.
- Comprobante individual.
- PDF.
- Excel.
- Estado emitido/anulado.
- Asociación al período fiscal.


### 10. Libros fiscales

Incluye:

- Libro de Compras.
- Libro de Ventas.
- Filtros por empresa.
- Filtros por sucursal.
- Filtros por período.
- Visualización previa.
- Exportación PDF.
- Exportación Excel.
- Totales.
- Detalle de documentos.
- Separación por clasificación tributaria y alícuota.


### 11. Resumen de IVA

Incluye:

- Débito fiscal.
- Crédito fiscal.
- Ventas no gravadas.
- Compras no gravadas.
- Operaciones por alícuota.
- Exportaciones.
- Importaciones.
- Ajustes.
- Excedente anterior.
- Retenciones aplicables.
- Total preliminar.
- Conciliación con los libros.
- Detalle de documentos que componen cada total.


### 12. Períodos y cierres

Incluye estados:

```text
abierto
en revisión
cerrado
reabierto
anulado
```

El contador debe poder:

- Revisar inconsistencias.
- Confirmar totales.
- Cerrar el período.
- Descargar los reportes.
- Registrar observaciones.
- Solicitar o autorizar reapertura, según permisos.

Al cerrar, los documentos no deben editarse directamente.

### 13. Auditoría

Incluye:

- Usuario.
- Empresa.
- Fecha y hora.
- Acción.
- Entidad afectada.
- Valores anteriores.
- Valores nuevos.
- Motivo.
- IP o información técnica disponible.
- Exportación de bitácora.


## Integración con legacy y máquina fiscal

En el MVP no necesariamente necesitas una integración API. Es suficiente con un mecanismo confiable de importación CSV.

Debes definir dos entradas diferenciadas:

```text
CSV de software contable legacy
CSV de máquina fiscal / reportes Z
```

Aunque ambos sean CSV, no debes asumir que tienen el mismo significado.

Por ejemplo:

- El legacy podría entregar facturas de compra y venta.
- La máquina fiscal podría entregar totales diarios.
- El legacy podría entregar retenciones ya calculadas.
- La máquina fiscal podría no contener datos suficientes para retenciones.
- Los reportes Z podrían consolidar varias facturas en una sola fila.

Por eso conviene almacenar la procedencia:

```text
source_system = legacy_accounting
source_system = fiscal_machine
source_system = manual
```

Y también:

```text
source_file_id
source_row_number
import_batch_id
```

Con esto podrás responder:

> ¿De qué archivo y de qué fila salió este importe del Libro de Ventas?

# Excluye inicialmente

La exclusión debe ser explícita para evitar que el MVP se convierta en una plataforma demasiado grande.

## Facturación electrónica

Se excluye:

- Emisión de facturas electrónicas.
- Numeración de facturación.
- Control fiscal de facturas emitidas.
- Integración con proveedor autorizado.
- Generación de XML fiscal.
- Firma electrónica de facturas.
- Código QR fiscal de factura.
- Envío automático de facturas.

Esto queda para la versión 2, pero el diseño debe evitar bloquearlo. Por ejemplo, conviene que `sales_documents` distinga entre:

```text
source_type = imported
source_type = manual
source_type = electronically_issued
```

La versión 1 solo utilizaría `imported` y `manual`.

## Portal de proveedores

Se excluye:

- Inicio de sesión de proveedores.
- Recuperación de contraseña para proveedores.
- Bandeja de comprobantes.
- Descarga directa por proveedor.
- Consulta de saldos.
- Aceptación/rechazo de comprobantes.
- Historial de comunicaciones.

Sin embargo, los datos necesarios para una futura cuenta de proveedor deben estar normalizados desde el comienzo.

## Envío por correo

Se excluye:

- Correos automáticos.
- Plantillas de email.
- Reintentos de entrega.
- Seguimiento de apertura.
- Confirmación de recepción.
- Configuración SMTP por empresa.

El PDF se generará y descargará manualmente en esta fase.

## Contabilidad financiera completa

Se excluye:

- Libro diario.
- Libro mayor.
- Plan de cuentas.
- Asientos contables.
- Balance de comprobación.
- Estado de resultados.
- Cuentas por pagar completas.
- Cuentas por cobrar completas.
- Conciliación bancaria.
- Inventario.
- Costos.
- Nómina.
- Activos fijos.

El sistema se integrará conceptualmente con el software legacy, pero no intentará reemplazarlo.

## Integraciones en tiempo real

Se excluye:

- API con el software legacy.
- API con la máquina fiscal.
- Webhooks.
- Sincronización automática.
- Conexión bancaria.
- Conexión directa con sistemas de proveedores.
- Integración automática con SENIAT.

La entrada será mediante CSV importado por el usuario.

## Automatización avanzada

Se excluye inicialmente:

- OCR de facturas.
- Lectura automática de imágenes.
- Clasificación con inteligencia artificial.
- Detección inteligente de anomalías.
- Predicción tributaria.
- Agentes autónomos.
- Reglas aprendidas automáticamente.

Puedes dejar una arquitectura preparada para ello, pero no debe formar parte del MVP.

## Operaciones tributarias complejas

Según lo que confirme el contador, conviene excluir o dejar como configuración posterior:

- Prorrata compleja de créditos fiscales.
- Regímenes especiales.
- Operaciones internacionales avanzadas.
- Beneficiarios no domiciliados.
- Retenciones con múltiples escenarios excepcionales.
- Reglas históricas complejas.
- Migraciones masivas de varios ejercicios.
- Correcciones retroactivas de períodos cerrados.
- Declaración electrónica automática.

No significa que el sistema nunca las soporte; significa que deben incorporarse únicamente cuando exista una regla documentada y un caso real.

# Flujo de pantalla sugerido

La interfaz debe estar organizada alrededor de tres conceptos:

```text
Empresa activa
Período fiscal activo
Rol del usuario
```

En la parte superior de la aplicación conviene mostrar siempre:

```text
Empresa: Empresa Demo, C.A.
Período: Septiembre 2026
Sucursal: Todas
Rol: Contador
Estado: En revisión
```

Esto reduce errores, especialmente en un sistema multiempresa.

## 1. Inicio de sesión

Pantalla:

```text
Correo o usuario
Contraseña
Empresa, si el usuario tiene acceso a varias
```

Después del inicio de sesión, el usuario debe seleccionar o confirmar la empresa activa.

Un contador puede tener acceso a varias empresas:

```text
Empresa A
Empresa B
Empresa C
```

Un administrativo podría acceder solo a una.

## 2. Dashboard

El dashboard debe cambiar según el rol.

### Para el administrativo

Mostrar:

- Archivos CSV pendientes de importar.
- Filas con errores.
- Compras pendientes de revisión.
- Ventas pendientes de revisión.
- Retenciones pendientes.
- Período actual.
- Documentos duplicados detectados.


### Para el contador

Mostrar:

- Períodos abiertos.
- Períodos en revisión.
- Diferencias entre compras y retenciones.
- Diferencias entre libros y resumen.
- Comprobantes pendientes de emisión.
- Períodos listos para cerrar.
- Retenciones fuera de plazo o próximas al vencimiento, según configuración.


### Para el auditor

Mostrar:

- Períodos cerrados.
- Reportes emitidos.
- Cambios recientes.
- Anulaciones.
- Reaperturas.
- Importaciones realizadas.
- Usuarios que modificaron documentos.

Ejemplo:

```text
Empresa activa: COFFE DINNER 87, C.A.
Período: septiembre 2026

Compras importadas:              143
Ventas importadas:               187
Documentos con errores:             4
Retenciones IVA pendientes:         8
Retenciones ISLR pendientes:       11
Período:                    En revisión
```


## 3. Selector de empresa y período

Debe estar disponible en todas las pantallas.

```text
Empresa
  └── Sucursal
        └── Período fiscal
```

Acciones:

- Cambiar empresa.
- Cambiar sucursal.
- Cambiar período.
- Abrir período.
- Enviar a revisión.
- Cerrar período.

El sistema debe impedir que un usuario consulte accidentalmente documentos de otra empresa.

## 4. Importación CSV

Esta será una de las pantallas principales del MVP.

### Paso 1: seleccionar tipo de archivo

```text
¿Qué desea importar?

[Compras]
[Ventas]
[Retenciones IVA]
[Retenciones ISLR]
[Reportes Z]
```

En la primera versión puedes comenzar solo con compras y ventas, y luego habilitar importación de retenciones si el negocio lo requiere.

### Paso 2: elegir fuente

```text
Fuente:
[Software contable legacy]
[Máquina fiscal]
[Archivo manual]
```


### Paso 3: cargar archivo

Mostrar:

- Nombre.
- Tamaño.
- Fecha de carga.
- Cantidad de filas.
- Empresa.
- Período.
- Usuario responsable.


### Paso 4: mapear columnas

Ejemplo:


| Columna CSV | Campo del sistema |
| :-- | :-- |
| `fecha` | Fecha del documento |
| `rif_proveedor` | RIF del proveedor |
| `factura` | Número de factura |
| `control` | Número de control |
| `subtotal` | Base imponible |
| `iva` | IVA causado |
| `total` | Total del documento |
| `ret_iva` | IVA retenido |

El usuario debe poder guardar un perfil de importación por fuente.

### Paso 5: validar

Mostrar indicadores:

```text
Filas totales:          200
Filas válidas:          187
Filas con advertencias:   8
Filas rechazadas:         5
Duplicados:               3
```

La pantalla debe mostrar errores por fila:

```text
Fila 18:
- RIF inválido

Fila 42:
- Factura duplicada en el período

Fila 67:
- El total no coincide con base + IVA

Fila 91:
- Proveedor no encontrado
```


### Paso 6: confirmar

El usuario puede:

- Importar solo válidas.
- Descargar errores.
- Cancelar.
- Corregir y volver a cargar.
- Crear automáticamente terceros inexistentes, si el contador lo autoriza.


### Paso 7: resultado

```text
Importación completada
187 documentos creados
8 documentos importados con advertencias
5 documentos rechazados
3 documentos duplicados
```


## 5. Listado de compras

Columnas recomendadas:

```text
Fecha
Proveedor
RIF
Factura
Control
Base imponible
IVA
Total
IVA retenido
ISLR retenido
Estado
Origen
Acciones
```

Filtros:

- Empresa.
- Sucursal.
- Período.
- Fecha.
- Proveedor.
- RIF.
- Número de factura.
- Estado.
- Clasificación fiscal.
- Fuente de importación.
- Con/sin retención.

Acciones:

- Ver.
- Editar, si el período está abierto.
- Adjuntar soporte.
- Generar retención.
- Marcar como validada.
- Anular según permisos.
- Ver historial.


## 6. Formulario de compra

Secciones:

### Datos generales

```text
Empresa
Sucursal
Proveedor
Fecha de factura
Fecha de recepción
Tipo de documento
Número de factura
Número de control
Factura afectada
```


### Clasificación fiscal

```text
Tipo de operación
Alícuota
Gravada
Exenta
No sujeta
Sin derecho a crédito fiscal
Importación
```


### Importes

```text
Base imponible
IVA causado
Total de compra
IVA retenido
ISLR retenido
```


### Retenciones

```text
¿Aplica retención IVA?
Regla aplicada
Porcentaje
Monto retenido

¿Aplica retención ISLR?
Concepto
Regla aplicada
Sustraendo
Monto retenido
```


### Soportes

```text
Adjuntar factura
Adjuntar documento de retención
Observaciones
```

El sistema debe mostrar los cálculos antes de guardar:

```text
Base:             1.000,00
IVA:                160,00
Total:            1.160,00
Retención IVA:      120,00
Retención ISLR:      20,00
Pago neto:        1.020,00
```


## 7. Listado de ventas

Columnas:

```text
Fecha
Cliente
RIF
Factura
Control
Reporte Z
Base imponible
IVA
Total
Sucursal
Máquina fiscal
Estado
Origen
```

Filtros:

- Período.
- Sucursal.
- Máquina fiscal.
- Reporte Z.
- Cliente.
- Tipo de transacción.
- Alícuota.
- Estado de validación.


## 8. Carga de reportes Z

Como existe una máquina fiscal, conviene incluir una pantalla específica:

```text
Reportes Z
  ├── Importar CSV
  ├── Ver reportes
  ├── Validar numeración
  ├── Revisar totales
  └── Asociar a sucursal/máquina
```

La importación debe mostrar:

```text
Fecha del reporte
Número Z
Máquina fiscal
Sucursal
Primera factura
Última factura
Ventas gravadas
Ventas exentas
IVA
Total
```

Validaciones:

- Reporte Z duplicado.
- Salto en numeración.
- Fecha fuera del período.
- Totales negativos inesperados.
- Máquina fiscal no registrada.
- Diferencia entre datos del CSV y totales esperados.


## 9. Bandeja de retenciones IVA

Separar por estado:

```text
Pendientes
En revisión
Listas para emitir
Emitidas
Entregadas
Anuladas
```

Cada registro debe mostrar:

```text
Proveedor
RIF
Factura
Fecha
Base
IVA causado
Porcentaje de retención
Monto retenido
Período
Estado
```

Acciones:

- Ver cálculo.
- Ver factura.
- Generar comprobante.
- Previsualizar PDF.
- Emitir.
- Descargar PDF.
- Descargar Excel.
- Anular, según permisos.

Al emitir:

1. El sistema bloquea la operación.
2. Reserva el número consecutivo.
3. Genera el comprobante.
4. Guarda una copia inmutable.
5. Registra usuario y fecha.
6. Cambia el estado a `emitido`.

## 10. Bandeja de retenciones ISLR

Filtros:

- Empresa.
- Período.
- Proveedor/beneficiario.
- Concepto.
- Estado.
- Fecha de pago.
- Fecha de retención.

Formulario:

```text
Beneficiario
RIF
Factura o soporte
Concepto de pago
Fecha de pago/abono
Monto pagado
Base sujeta
Porcentaje
Sustraendo
Monto retenido
```

El usuario debe visualizar la regla que se aplicó:

```text
Regla: Servicios profesionales
Vigencia: 01/01/2026 - vigente
Base: monto sujeto
Porcentaje: configurado
Sustraendo: configurado
```

Esto facilita la revisión del contador y la auditoría posterior.

## 11. Reportes

Pantalla:

```text
Reportes fiscales

[Libro de Compras]
[Libro de Ventas]
[Resumen de IVA]
[Retenciones IVA]
[Retenciones ISLR]
[Conciliación]
[Auditoría]
```

Parámetros comunes:

```text
Empresa
Sucursal
Período
Desde
Hasta
Formato: PDF / Excel
```


### Libro de Compras

Debe reproducir la estructura solicitada por la plantilla, pero con información proveniente del sistema.

### Libro de Ventas

Debe incluir las operaciones importadas, incluyendo la posibilidad de datos provenientes de reportes Z, según la regla definida para la empresa.

### Resumen

Debe permitir navegar desde cada total al detalle:

```text
Total compras gravadas
  └── Ver 143 documentos

Crédito fiscal
  └── Ver documentos que lo componen

IVA retenido
  └── Ver comprobantes asociados
```


## 12. Cierre de período

Flujo sugerido:

```text
Abierto
   ↓
En revisión
   ↓
Validado por contador
   ↓
Cerrado
```

Antes de cerrar, el sistema debe mostrar un checklist:

- No existen filas pendientes de importación.
- No existen documentos con errores críticos.
- No hay facturas duplicadas.
- Todos los RIF están validados.
- Las bases coinciden con los totales.
- Las notas de crédito tienen documento afectado.
- Las retenciones emitidas están conciliadas.
- El Libro de Compras fue generado.
- El Libro de Ventas fue generado.
- El Resumen fue generado.
- El contador confirmó el cierre.

Al cerrar:

- Se bloquea la edición ordinaria.
- Se guardan las versiones PDF y Excel.
- Se genera un resumen de integridad.
- Se registra el usuario responsable.
- Se registra fecha y hora.
- Se inicia una nueva versión si posteriormente se autoriza una corrección.


## 13. Auditoría

El auditor debe poder consultar:

```text
Quién creó el documento
Quién lo modificó
Qué campos cambiaron
Cuándo cambió
Desde qué archivo se importó
Qué regla tributaria se aplicó
Qué comprobante se generó
Si fue anulado
Por qué fue anulado
Cuándo se cerró el período
Si hubo reapertura
```

Una vista útil sería:

```text
Documento: Compra #845
Empresa: Empresa A
Origen: CSV legacy, fila 64
Creado por: usuario_admin
Validado por: usuario_contador
Retención IVA: comprobante 20260900000021
Retención ISLR: comprobante ISLR-00043
Última modificación: 29/09/2026 10:35
Estado: incluido en período cerrado
```


# Arquitectura funcional del MVP

Una separación adecuada sería:

```text
Identidad y acceso
        ↓
Multiempresa y sucursales
        ↓
Importación CSV
        ↓
Documentos fiscales
        ↓
Motor tributario
        ↓
Retenciones
        ↓
Períodos y cierres
        ↓
Reportes PDF/Excel
        ↓
Auditoría
```

No conviene construir directamente:

```text
Formulario de compra → plantilla Excel
```

Conviene construir:

```text
Formulario/CSV
   → documento fiscal normalizado
   → reglas tributarias
   → eventos fiscales
   → reportes
```


## Entidades importantes

Un modelo inicial en PostgreSQL podría contener:

```text
users
roles
permissions
companies
company_user
branches
fiscal_periods

parties
party_addresses
party_tax_profiles

import_batches
import_rows
import_mappings
source_files

purchase_documents
purchase_document_lines
sales_documents
sales_document_lines
fiscal_adjustments
z_reports

tax_rates
tax_categories
tax_rules
withholding_rules
withholding_concepts

iva_withholdings
iva_withholding_lines
islr_withholdings
islr_withholding_lines

document_series
generated_reports
report_versions
attachments
audit_events
```

En casi todas las tablas operativas debes considerar:

```text
company_id
branch_id nullable
fiscal_period_id
created_by
updated_by
created_at
updated_at
```


## Estados recomendados

### Documento fiscal

```text
draft
imported
under_review
validated
included
voided
```


### Retención

```text
draft
calculated
approved
issued
delivered
voided
```


### Período

```text
open
under_review
closed
reopened
```


### Importación

```text
uploaded
mapping
validating
validated
partially_imported
completed
failed
```


## Prioridad de implementación

### Iteración 1: base multiempresa

- Autenticación.
- Usuarios.
- Roles.
- Empresas.
- Sucursales opcionales.
- Períodos fiscales.
- Terceros.


### Iteración 2: importación

- Plantillas CSV.
- Importación de compras.
- Importación de ventas.
- Validación.
- Errores por fila.
- Historial de lotes.


### Iteración 3: documentos y cálculos

- Compras.
- Ventas.
- Notas de crédito/débito.
- Alícuotas.
- Clasificaciones fiscales.
- Totales y validaciones.


### Iteración 4: retenciones

- Reglas IVA.
- Reglas ISLR.
- Numeración.
- Comprobantes.
- PDF/Excel.
- Anulación.


### Iteración 5: reportes

- Libro de Compras.
- Libro de Ventas.
- Resumen de IVA.
- Reportes de retenciones.
- Conciliaciones.


### Iteración 6: cierre y auditoría

- Cierre de período.
- Bloqueos.
- Versiones de reportes.
- Bitácora.
- Reapertura controlada.
- Migración histórica.


# Resumen práctico

Para esta primera versión, ERP-TributarioLite debe ser:

```text
Multiempresa
Con usuarios y roles
Con sucursales opcionales
Con importación CSV
Compatible con software legacy y máquina fiscal
Orientado a 100-200 documentos mensuales
Con migración inicial de 100-200 documentos
Con compras y ventas
Con retenciones IVA e ISLR
Con cierre de períodos
Con auditoría
Con exportación PDF y Excel
Sin facturación electrónica
Sin portal de proveedores
Sin envío por correo
Sin integración API en tiempo real
Sin contabilidad financiera completa
```

La decisión de arquitectura más importante es esta:

> **El CSV, el software legacy y la máquina fiscal son fuentes de entrada; los libros y comprobantes son salidas derivadas.**

Si mantienes esa separación, la versión 2 podrá agregar facturación electrónica, portal de proveedores y correo sin tener que reconstruir el núcleo tributario.

<span style="display:none">[^3_10][^3_11][^3_12][^3_13][^3_14][^3_15][^3_4][^3_5][^3_6][^3_7][^3_8][^3_9]</span>

<div align="center">⁂</div>

[^3_1]: https://es.slideshare.net/slideshow/manejo-de-libros-contables-en-venezuela-pdf/271255761

[^3_2]: https://finanzasdigital.com/gaceta-oficial-43171-seniat-agentes-retencion-iva-2025/

[^3_3]: https://www.mmasociados.net/Normativas/ISLR/DECRETO/decreto_N1808.pdf

[^3_4]: http://historico.tsj.gob.ve/decisiones/spa/noviembre/320425-00663-31122-2022-2016-0228.HTML

[^3_5]: https://seniatoriginal.seniat.gob.ve/portal/page/portal/PORTAL_SENIAT

[^3_6]: https://www.lstributos.com/2025/07/providencia-snat-2025-00054.html

[^3_7]: https://naymaconsultores.com/las-firmas-personales-ahora-son-agentes-de-retencion-de-iva/

[^3_8]: https://www.ks7000.net.ve/2017/06/17/islr-retenciones/

[^3_9]: https://docs.cachicamo.app/fiscal/retentions

[^3_10]: https://cachicamo.app/blog/retenciones-islr-decreto-1808-tabla/

[^3_11]: https://es.slideshare.net/slideshow/decreto-1808-pptx-islr-contabilidad-impuestos/284873438?nway-content_model=A

[^3_12]: https://blog.solucioneslmv.com/comprobantes-de-retencion-de-islr/

[^3_13]: https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/2025/nota-informativa-providencias-administrativas-de-retencion-de-iva.pdf

[^3_14]: https://naymaconsultores.com/quienes-deben-hacer-retenciones-de-islr-en-venezuela/

[^3_15]: https://alliottve.com/publicaciones/https-alliottve-com-snat-00054/

