Claro. Para el cliente conviene transformar el cuestionario técnico en un **documento de levantamiento y validación funcional**, donde las respuestas recomendadas se presenten como propuestas de negocio/fiscales que el cliente pueda **confirmar, modificar o marcar como pendiente de validación contable**.

A continuación te dejo una versión mucho más ejecutiva, sin programación, bases de datos ni terminología de desarrollo.

# Cuestionario de Levantamiento Fiscal y Funcional

## ERP Tributario Lite — Venezuela

**Objetivo:** definir y validar, junto con el cliente, las reglas fiscales, operativas y documentales que deberá contemplar el sistema.

> **Instrucciones para el cliente:**
> Las respuestas indicadas como **“Propuesta”** representan el criterio funcional recomendado para el diseño inicial del sistema. El cliente podrá **Aprobar, Modificar o Marcar para Validación Contable/Fiscal** cada punto.

---

## 1. Datos fiscales de la empresa

| Tema                                | Respuesta propuesta                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contribuyente de IVA**            | El sistema deberá identificar la condición fiscal de cada empresa: contribuyente, no contribuyente, exento u otra condición aplicable.                         |
| **Contribuyente especial**          | Se deberá registrar expresamente si la empresa tiene condición de contribuyente especial, incluyendo la fecha desde la cual aplica.                            |
| **Agente de retención de IVA**      | La condición de agente de retención deberá registrarse de forma independiente y conforme a la normativa vigente.                                               |
| **Agente de retención de ISLR**     | Se deberá identificar si la empresa está obligada a practicar retenciones de ISLR.                                                                             |
| **Actividades económicas**          | Se permitirá registrar varias actividades económicas, indicando cuál es la principal y las condiciones fiscales aplicables a cada una.                         |
| **Sucursales o establecimientos**   | El sistema deberá permitir registrar varias sucursales, sedes o establecimientos pertenecientes a una misma empresa.                                           |
| **Facturación por establecimiento** | Se deberá contemplar la posibilidad de manejar numeraciones, puntos de venta, cajas o máquinas fiscales diferentes por establecimiento cuando corresponda.     |
| **Cuentas bancarias**               | Se deberán registrar las distintas cuentas bancarias utilizadas por la empresa.                                                                                |
| **Métodos de pago**                 | Se deberán contemplar los diferentes medios de pago utilizados en las operaciones.                                                                             |
| **Varias empresas relacionadas**    | Cada empresa deberá mantener su propia información y condición fiscal, aunque varias empresas pertenezcan al mismo grupo o funcionen en una misma sede física. |

### Validación requerida por el cliente

* [ ] Aprobado
* [ ] Requiere modificación
* [ ] Requiere validación contable/fiscal

**Observaciones:**

---

# 2. Períodos fiscales y contables

| Tema                                   | Respuesta propuesta                                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Período del IVA**                    | El sistema deberá trabajar con períodos fiscales mensuales para la determinación del IVA.                                                                 |
| **Retenciones**                        | Las retenciones deberán manejarse considerando el momento fiscal que corresponda a cada tipo de retención, independientemente del período de facturación. |
| **Fecha de la operación**              | Se deberán distinguir las fechas de emisión, recepción, pago y demás fechas relevantes de una operación.                                                  |
| **Cierre de períodos**                 | Un período cerrado no deberá modificarse libremente. Cualquier reapertura deberá quedar debidamente autorizada y registrada.                              |
| **Reapertura**                         | Deberá existir un procedimiento controlado para reabrir períodos cerrados cuando sea necesario.                                                           |
| **Operaciones de períodos anteriores** | El sistema deberá permitir registrar operaciones recibidas posteriormente sin perder la fecha fiscal original de la operación.                            |
| **Ajustes de períodos anteriores**     | Los ajustes deberán conservar el historial de la operación original y registrar el motivo del ajuste.                                                     |
| **Notas de crédito y débito**          | Deberán relacionarse con el documento original y afectar correctamente los valores fiscales correspondientes.                                             |
| **Calendario fiscal**                  | El sistema deberá contemplar las fechas de vencimiento y obligaciones fiscales aplicables a la empresa.                                                   |

**Criterio propuesto:**
La fecha de registro en el sistema no deberá sustituir la fecha fiscal original de la operación.

---

# 3. Retenciones de IVA

La normativa venezolana vigente establece, con carácter general, una retención del **75 % del impuesto causado** para los agentes sujetos al régimen, contemplando supuestos específicos de retención del **100 %**. La normativa aplicable deberá mantenerse actualizada y validarse para cada período.

| Tema                                              | Respuesta propuesta                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **¿Quién retiene?**                               | Las empresas que tengan la condición legal de agentes de retención de IVA.                                                                  |
| **Proveedores sujetos a retención**               | El sistema deberá determinar si una operación está sujeta a retención según la condición fiscal del proveedor y las reglas vigentes.        |
| **Proveedores excluidos**                         | Se deberán contemplar las exclusiones establecidas por la normativa vigente.                                                                |
| **Porcentaje general**                            | 75 % del IVA causado, sujeto a las excepciones establecidas legalmente.                                                                     |
| **Retención del 100 %**                           | Se deberá contemplar para los casos específicamente establecidos por la normativa.                                                          |
| **Base de cálculo**                               | La retención se calculará sobre el IVA causado y no sobre el monto total de la factura, salvo las reglas especiales que correspondan.       |
| **Facturas con diferentes tratamientos fiscales** | El sistema deberá permitir distinguir operaciones gravadas, exentas, no sujetas y otros tratamientos cuando existan en una misma operación. |
| **Notas de crédito/débito**                       | Deberán afectar las retenciones correspondientes de acuerdo con la operación original y la normativa aplicable.                             |
| **Certificados de retención**                     | Se deberán generar comprobantes de retención con la información requerida legalmente.                                                       |
| **Anulación o corrección**                        | Los comprobantes emitidos no deberán modificarse directamente; las correcciones deberán conservar el historial correspondiente.             |
| **Numeración**                                    | La numeración de los comprobantes deberá respetar la estructura autorizada o utilizada por cada empresa/establecimiento.                    |
| **Entrega al proveedor**                          | El sistema deberá controlar la emisión y entrega de los comprobantes dentro de los plazos aplicables.                                       |

**Punto a validar:** tratamiento específico de cada tipo de proveedor y de las operaciones que puedan estar excluidas o sujetas a retención especial.

---

# 4. Retenciones de ISLR

Las retenciones de ISLR dependerán del **concepto pagado, condición del beneficiario, naturaleza de la operación y normativa vigente**. La normativa contempla, entre otros, conceptos como honorarios profesionales, comisiones, alquileres, publicidad, transporte y determinados servicios.

| Tema                              | Respuesta propuesta                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Conceptos sujetos a retención** | El sistema deberá contemplar diferentes conceptos de retención de ISLR y permitir incorporar nuevas reglas cuando cambie la normativa. |
| **Personas naturales**            | Se deberán contemplar reglas específicas para personas naturales residentes y las demás condiciones que correspondan.                  |
| **Personas jurídicas**            | Se deberán contemplar las reglas aplicables a personas jurídicas según su condición fiscal.                                            |
| **Honorarios profesionales**      | Deberán manejarse como un concepto específico de retención.                                                                            |
| **Comisiones**                    | Deberán manejarse como concepto específico.                                                                                            |
| **Alquileres**                    | Deberán contemplarse cuando corresponda.                                                                                               |
| **Publicidad**                    | Deberá contemplarse como concepto sujeto a las reglas correspondientes.                                                                |
| **Transporte**                    | Deberá contemplarse según las condiciones establecidas por la normativa.                                                               |
| **Otros servicios**               | Se deberán poder incorporar otros conceptos de retención.                                                                              |
| **Base de cálculo**               | La base, porcentaje, mínimo y sustraendo dependerán del concepto y de las condiciones del beneficiario.                                |
| **Momento de la retención**       | Se deberá considerar el momento fiscal establecido para la retención, incluyendo pago o abono en cuenta cuando corresponda.            |
| **Pagos parciales**               | El sistema deberá permitir registrar retenciones asociadas a pagos parciales.                                                          |
| **Certificados**                  | Se deberán generar los comprobantes de retención con la información requerida.                                                         |
| **Anulaciones/correcciones**      | Las correcciones deberán mantener trazabilidad y no eliminar el documento original.                                                    |

**Punto crítico:** las tasas, bases, mínimos y sustraendos deberán ser validados por el responsable contable/fiscal antes de su puesta en producción.

---

# 5. Registro de compras y ventas

El sistema deberá permitir registrar las operaciones comerciales necesarias para generar posteriormente los libros y reportes fiscales.

### Compras

Se propone registrar como mínimo:

* Proveedor.
* RIF.
* Número de factura.
* Número de control.
* Fecha de factura.
* Fecha de recepción.
* Base imponible.
* IVA.
* Exentos/no sujetos, cuando corresponda.
* Total.
* Retención de IVA.
* Retención de ISLR.
* Forma de pago.
* Estado de la operación.
* Notas de crédito o débito relacionadas.

### Ventas

Se propone registrar:

* Cliente.
* RIF.
* Número de factura.
* Número de control.
* Fecha.
* Base imponible.
* IVA.
* Operaciones exentas/no sujetas.
* Total.
* Retenciones recibidas, cuando correspondan.
* Forma de pago.
* Notas de crédito o débito relacionadas.

---

# 6. Importación de información mediante archivos CSV

El sistema deberá permitir incorporar información proveniente de sistemas anteriores, hojas de cálculo, máquinas fiscales u otras fuentes.

| Tema                       | Respuesta propuesta                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Formato de archivo**     | Se podrán manejar diferentes estructuras de archivo según el origen de los datos.                                    |
| **Separador**              | Se deberán admitir formatos comunes como coma, punto y coma o tabulación.                                            |
| **Decimales**              | Se deberán admitir formatos con coma o punto decimal según el archivo de origen.                                     |
| **Fechas**                 | Las fechas deberán identificarse y convertirse correctamente al formato utilizado por el sistema.                    |
| **RIF**                    | Se deberá normalizar el formato del RIF sin perder el valor original.                                                |
| **Campos vacíos**          | Los valores vacíos, cero, N/A u otros indicadores deberán interpretarse según el campo correspondiente.              |
| **Duplicados**             | El sistema deberá detectar posibles operaciones duplicadas antes de incorporarlas.                                   |
| **Retenciones existentes** | Se deberá poder importar una retención ya calculada y compararla con el cálculo esperado.                            |
| **Diferencias**            | Las diferencias deberán quedar identificadas para revisión, sin alterar automáticamente la información original.     |
| **Errores**                | Un error en una operación no debería obligatoriamente impedir la importación de todas las demás operaciones válidas. |
| **Corrección**             | Las operaciones rechazadas deberán poder corregirse y procesarse nuevamente.                                         |
| **Archivo original**       | Se deberá conservar el archivo original utilizado para la importación como respaldo y evidencia del proceso.         |

---

# 7. Libros, comprobantes y reportes

El sistema deberá utilizar la información registrada para generar los documentos y reportes requeridos.

### Como mínimo se contempla:

1. **Libro de Compras.**
2. **Libro de Ventas.**
3. **Resumen/comprobante de retenciones de ISLR.**
4. **Comprobante de retención de IVA.**
5. **Reportes y resúmenes fiscales requeridos por la empresa.**

**Criterio propuesto:** los reportes deberán generarse a partir de las operaciones registradas, evitando mantener información fiscal duplicada en diferentes lugares.

---

# 8. Control y seguridad de la información fiscal

Se propone que el sistema mantenga un historial de las operaciones relevantes.

| Situación          | Criterio propuesto                                               |
| ------------------ | ---------------------------------------------------------------- |
| Documento emitido  | No deberá modificarse libremente.                                |
| Documento anulado  | Deberá conservarse el registro de la anulación.                  |
| Corrección         | Deberá quedar registrada la operación original y su corrección.  |
| Período cerrado    | No deberá modificarse sin autorización.                          |
| Reapertura         | Deberá quedar registrada la persona responsable y el motivo.     |
| Importación        | Deberá conservarse la evidencia del archivo importado.           |
| Cambios relevantes | Deberá existir trazabilidad de quién realizó el cambio y cuándo. |

---

# 9. Reglas fiscales y cambios normativos

El sistema deberá permitir que las reglas fiscales puedan cambiar sin perder la información histórica.

Esto es especialmente importante para:

* Porcentajes de retención.
* Bases de cálculo.
* Sustraendos.
* Unidades tributarias.
* Sujetos obligados.
* Exclusiones.
* Fechas de vigencia.
* Condiciones especiales.
* Formatos y requisitos de comprobantes.

**Criterio propuesto:** una modificación normativa deberá aplicarse a las operaciones correspondientes a su período de vigencia, sin alterar automáticamente los cálculos históricos ya realizados.

---

# 10. Aspectos que requieren validación del cliente

Antes de aprobar definitivamente el funcionamiento del sistema, el cliente deberá confirmar:

### Información de la empresa

* [ ] Condición frente al IVA.
* [ ] Condición de contribuyente especial.
* [ ] Condición de agente de retención de IVA.
* [ ] Condición de agente de retención de ISLR.
* [ ] Actividades económicas.
* [ ] Sucursales/establecimientos.
* [ ] Máquinas fiscales/puntos de venta.
* [ ] Cuentas bancarias.
* [ ] Métodos de pago.

### Operaciones

* [ ] Tipos de compras.
* [ ] Tipos de ventas.
* [ ] Tipos de proveedores.
* [ ] Tipos de clientes.
* [ ] Notas de crédito.
* [ ] Notas de débito.
* [ ] Pagos parciales.
* [ ] Operaciones de períodos anteriores.

### Retenciones

* [ ] Tipos de retención de IVA utilizadas.
* [ ] Tipos de retención de ISLR utilizadas.
* [ ] Conceptos de ISLR aplicables.
* [ ] Porcentajes utilizados.
* [ ] Procedimiento de emisión de comprobantes.
* [ ] Procedimiento de corrección/anulación.

### Importación

* [ ] Sistemas de origen.
* [ ] Formatos CSV existentes.
* [ ] Formatos de máquinas fiscales.
* [ ] Archivos históricos disponibles.
* [ ] Períodos que deberán migrarse.

---

# 11. Criterio general de aprobación

La aprobación de este documento tendrá como finalidad establecer la **base funcional y fiscal del ERP Tributario Lite**.

Las respuestas podrán clasificarse como:

**APROBADO**
El criterio queda aceptado para el diseño del sistema.

**MODIFICAR**
El cliente propone una condición diferente.

**VALIDAR**
El punto requiere confirmación del contador, asesor tributario o especialista fiscal.

**PENDIENTE**
La información aún no está disponible y será definida posteriormente.

> **Nota:** Las reglas fiscales deberán ser validadas por el responsable contable/tributario de la empresa antes de su implementación definitiva. El sistema deberá contemplar la normativa vigente y conservar la trazabilidad histórica de las reglas aplicadas a cada período.

