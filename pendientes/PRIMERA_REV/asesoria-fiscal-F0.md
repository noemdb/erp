# Asesoría técnico-fiscal F0 — ERP-TributarioLite

> **Estado:** v0.1 propuesta · **Actualizado:** 2026-10-01 · **Dueño:** equipo + contador cliente · **Fuentes:** Decreto 1.808 (G.O. 36.203, 12/05/1997), Providencia SNAT/2025/000054, tabla de retenciones ISLR (Grant Thornton, UT 43), Providencia SNAT/2025/000048 (UT), `TODO.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`
> Ver también: `anexos/checklist-F0.md`, `dorados-propuestos-F0.json`, `DECISIONS.md`, `TODO.md`

## 0. Cómo leer este documento

Este memo responde la tabla de pendientes de F0 (G2 abono en cuenta, ISLR, G9 numeración, permisos, archivos/formato) con criterio técnico-fiscal para el entorno venezolano.

**Alcance y límites.** Es asesoría de apoyo para diseñar el sistema; **no reemplaza la opinión firmada del contador público colegiado** que valida la Matriz de Reglas v1. Los textos normativos se leyeron en transcripciones publicadas (Cachicamo Docs, Grant Thornton); antes de firmar hay que cotejarlos con la Gaceta Oficial.

| Marca | Significado |
|---|---|
| ✅ | Verificado en el texto normativo consultado |
| 🟡 | Criterio profesional o práctica generalizada: el contador debe confirmarlo |
| ❓ | Decisión del cliente (no se deduce de la norma) |

---

## 1. Abono en cuenta (G2)

### 1.1 Qué dice la norma

- ✅ **IVA** — Providencia SNAT/2025/000054, art. 13: la retención se practica cuando se realice **el pago o abono en cuenta, lo que ocurra primero, independientemente del medio de pago**. Y define: *abono en cuenta* son las cantidades que el comprador **acredite en su contabilidad o registros**.
- ✅ **ISLR** — Decreto 1.808, art. 1: se retiene "en el momento del pago o del abono en cuenta". Art. 21: se entera dentro de los 3 primeros días hábiles del mes siguiente a aquel en que se efectuó el pago o abono.
- 🟡 Para ISLR el Decreto no define "abono en cuenta". El criterio de la Administración, citado en jurisprudencia contencioso-tributaria, es la acreditación o anotación en el haber que hace el deudor en una cuenta a nombre del beneficiario. Hay contribuyentes que sostienen que debe esperarse a la disponibilidad jurídica y material. **Recomendación prudente:** aplicar el criterio de la Administración (abono = registro) y que el contador deje constancia si adopta otro.

### 1.2 Consecuencia práctica (es el hallazgo más importante)

Si la empresa lleva contabilidad por **causación** (lo habitual), al registrar la factura de compra en cuentas por pagar ya está acreditando en el haber del proveedor. Entonces:

> **El evento que dispara la retención suele ser el registro contable de la factura, no el pago.** El pago solo manda cuando ocurre antes (anticipos) o cuando la empresa no registra la cuenta por pagar.

Esto contradice el supuesto actual del esquema (`payments.fecha_pago` como disparador) y de `issue-islr.ts` (vigencia resuelta por `fecha_pago`).

### 1.3 Regla para el sistema

```
fecha_retencion(porción) = MIN(fecha_abono_en_cuenta, fecha_pago)   -- por cada porción de la obligación
```

- Cada porción del monto se retiene **una sola vez**, en el primer evento que la cubra.
- Un pago posterior a un abono que ya cubrió la factura **no genera otra retención**.
- Un anticipo (pago antes de la factura) retiene su porción en la fecha del pago.

### 1.4 Respuesta a las tres preguntas del cuadro

| Pregunta | Respuesta |
|---|---|
| ¿Qué asiento o registro cuenta como abono? | El que acredita la cuenta del proveedor (cuentas por pagar/acreedores): normalmente el asiento de causación de la factura de compra. En el sistema: **fecha de registro contable** que traiga el CSV del legacy, o la que el usuario confirme. 🟡 |
| ¿Se conserva fecha e importe por factura? | Sí, y es obligatorio: cada evento guarda `fecha`, `monto` y **asignación por documento** (un abono puede cubrir varias facturas). Sin eso no se puede reproducir ni auditar la retención. |
| ¿Abonos parciales o anteriores al pago? | Se modelan como eventos independientes con monto propio; ver escenarios `ABONO-01..03`. El tratamiento del sustraendo en pagos parciales de personas naturales es un punto de criterio abierto (ver §2.5). |

### 1.5 Impacto en el modelo (propuesta)

Reemplazar la idea "pago mínimo" por un **evento de liquidación** que generaliza pago y abono:

```sql
CREATE TABLE settlement_events (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  party_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('payment','account_credit')),
  event_date date NOT NULL,                 -- fecha del pago o del abono en cuenta
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'VES',
  source_ref text,                          -- asiento, N° de pago, etc. (trazabilidad)
  source_file_id uuid, source_row int,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','voided'))
);
CREATE TABLE settlement_allocations (
  event_id uuid REFERENCES settlement_events(id),
  purchase_document_id uuid NOT NULL,
  amount_allocated numeric(18,2) NOT NULL CHECK (amount_allocated > 0),
  PRIMARY KEY (event_id, purchase_document_id)
);
```

- `payments` / `payment_allocations` actuales pasan a ser el caso `event_type='payment'` (migración sin pérdida de datos).
- Constraint de negocio (app + test): por documento, `SUM(allocated por eventos activos) ≤ total del documento`.
- `tax-engine`: `computeIslrWithholding` recibe un **evento** (fecha, monto asignado), no la factura entera; la vigencia de reglas se resuelve con `event_date`.
- UI de importación: columna `fecha_registro` del CSV legacy → crea el `account_credit` por defecto, **marcado "inferido"** hasta que el contador confirme el criterio.

### 1.6 Preguntas para el cliente/contador (G2)

1. ¿Llevan contabilidad por causación o por base de caja?
2. En el software legacy, ¿la fecha de registro de una factura de compra es la fecha del asiento que acredita al proveedor?
3. ¿Registran facturas de compra días después de su fecha de emisión? (la fecha fiscal y la del abono pueden diferir)
4. ¿Hacen anticipos a proveedores? ¿Cómo los registran?
5. ¿Pueden entregar un ejemplo real: factura registrada el día X, pagada el día Y, con su retención?

---

## 2. ISLR: conceptos, beneficiarios y cálculo

### 2.1 Qué decide cada cosa

- ✅ La **obligación de retener ISLR no depende de ser "agente especial"**: depende del tipo de pago y del beneficiario (Decreto 1.808, arts. 1 y 9).
- ✅ **El cuestionario no puede decir qué conceptos usa la empresa**; eso se obtiene de sus pagos reales (ver §2.6).
- **Estrategia de datos:** cargar el catálogo completo del art. 9 como semilla versionada y que cada empresa **active solo los conceptos que paga**. El motor no calcula nada que la empresa no haya habilitado.

### 2.2 Catálogo base (art. 9) — conceptos más probables y su tratamiento

Tarifas del Decreto 1.808 con la tabla de práctica (UT 43). Los códigos de concepto SENIAT provienen de la tabla de Grant Thornton (UT 43/2025): 🟡 cotejar contra el portal antes de usar en exportaciones.

| N° | Concepto | PN residente (PNR) | PJ domiciliada (PJD) | Notas |
|---|---|---|---|---|
| 9.1.b | Honorarios profesionales | 3% (cód. 002) | 5% (cód. 004) | Sustraendo PNR, ver §2.3 |
| 9.1.c / d | Honorarios en hipódromos / centros de salud | 3% (010 / 012) | — | Pagador debe ser el centro, no el paciente |
| 9.2.a / b | Comisiones (inmuebles / mercantiles) | 3% (014 / 018) | 5% (016 / 020) | |
| 9.3.c | Intereses | 3% (025) | 5% (027) | |
| 9.11 | Servicios y contratistas | 1% (053) | 2% (055) | Base = precio total facturado de la prestación (art. 16 §2) |
| 9.12 | Arrendamiento de inmuebles | 3% (057) | 5% (059) | |
| 9.13 | Arrendamiento de bienes muebles | 3% (061) | 5% (063) | |
| 9.14 | Pagos de emisoras de tarjetas (y gasolina 1%) | 3% (065) | 5% (067) | Base = monto/((alícuota IVA/100)+1) |
| 9.15 | Fletes nacionales | 1% (071) | 3% (072) | |
| 9.16 / 9.17 | Seguros: corredores / reparaciones / centros de salud | 3% | 5% | |
| 9.18 | Fondos de comercio | 3% (079) | 5% (081) | Exige constancia de entero ante notario/registrador (art. 18) |
| 9.19 | Publicidad y propaganda (radio PJD 3%) | 3% (083) | 5% (084) | |
| 9.9–9.10, 9.20–9.21 | Premios, acciones | — | — | Poco probable; cargar pero deshabilitado |

**Beneficiarios no residentes / no domiciliados (PNNR, PJND):** tasas de 34 % o "Tarifa N° 2" con **acumulación anual en U.T.** (15 %/22 %/34 % por tramos). Propuesta: **v1 registra y marca "requiere revisión del contador"**, sin cálculo automático; el cálculo acumulado va a v1.1. Si el cliente paga a no residentes con frecuencia, subimos la prioridad.

**Fuera de alcance v1:** retención de sueldos y salarios (Capítulo II del Decreto): es nómina, no compras.

### 2.3 Fórmulas verificadas

- ✅ PN residente: `retención = base × % − (UT × % × 83,3334)`, con piso 0. Con UT = 43: sustraendo 3 % = 107,50; 1 % = 35,83; el pago mínimo que genera retención es 3.583,34.
- ✅ PJ domiciliada 5 %/3 %: el art. 9 §2 fija mínimos nominales de 1997 (Bs. 1.250 / 750 por monto a retener); 1 %/2 % se retienen sobre cualquier monto.
- 🟡 **Los mínimos nominales de 1997 quedaron sin efecto práctico tras las reconversiones**; las tablas de práctica no muestran mínimo para PJD. Confirmar con el contador.
- ✅ Art. 9 §3: no hay mínimo para premios, tarjetas ni acciones (numerales 9, 14, 20).
- ✅ Art. 20: sin retención en pagos en especie ni enriquecimientos exentos/exonerados. Art. 16 §1: sin retención en agua, electricidad, gas, telefonía y aseo domiciliario.
- ✅ Art. 9 §4: sociedades de personas domiciliadas siguen las tarifas de persona natural.
- 🟡 **Base sin IVA:** la práctica general retiene sobre la base imponible (sin IVA). El art. 16 §2 habla de "precio total facturado" para servicios; no pude verificar un criterio expreso de la Administración sobre IVA. **El contador debe fijar este punto**: cambia todos los montos.
- ✅ **Facturas multi-concepto:** si una factura mezcla servicio y bienes no vinculados, la práctica es separar por concepto y retener cada uno con su tarifa. El modelo debe permitir **varias líneas de retención por factura**.

### 2.4 UT y vigencia

- ✅ UT vigente: **Bs. 43,00** (Providencia SNAT/2025/000048, G.O. 43.140 del 02/06/2025). 🟡 No encontré reajustes posteriores en esta consulta; **verificar al momento de implementar y mantener la UT versionada con vigencia**, nunca como constante.
- ✅ COT art. 3 §3: tributos anuales usan la UT del cierre del ejercicio; los de otro período usan la del inicio. Para retenciones mensuales se opera con la UT vigente a la fecha de la retención: 🟡 confirmar con el contador.

### 2.5 Punto de criterio abierto: sustraendo en pagos parciales

El sustraendo se resta "en todo caso de retención a personas naturales residentes". Con pagos parciales hay dos lecturas:

| Criterio | Factura 50.000 pagada 20.000 + 30.000 (PNR 3 %) | Total |
|---|---|---|
| A — sustraendo en **cada** pago/abono | 492,50 + 792,50 | **1.285,00** |
| B — sustraendo **una vez** por factura | 1.500,00 − 107,50 | **1.392,50** |

Diferencia: 107,50. **Decisión del contador** (escenario `ISLR-07`). El motor debe soportar ambos con un parámetro por regla.

### 2.6 Modelo propuesto

```sql
CREATE TABLE islr_concepts (id, decree_ref text, name text, seniat_code_pnr text, seniat_code_pjd text, ...);
CREATE TABLE islr_concept_rates (
  concept_id uuid, beneficiary_type text CHECK (beneficiary_type IN ('PNR','PNNR','PJD','PJND')),
  base_pct numeric(7,4) DEFAULT 100,        -- p.ej. 90 en honorarios a no residentes
  rate numeric(7,4) NOT NULL,
  sustraendo_mode text CHECK (sustraendo_mode IN ('none','ut_factor')) DEFAULT 'none',
  min_payment_ut numeric, effective_range daterange NOT NULL,
  EXCLUDE USING gist (concept_id WITH =, beneficiary_type WITH =, effective_range WITH &&)
);
CREATE TABLE company_islr_concepts (company_id uuid, concept_id uuid, enabled boolean, PRIMARY KEY (company_id, concept_id));
```

### 2.7 Preguntas para el cliente (checklist de conceptos)

1. Marque cada concepto que **realmente paga** (lista de §2.2) y dé un ejemplo de proveedor para cada uno.
2. ¿Paga a personas jurídicas domiciliadas, naturales residentes, o también a no residentes/no domiciliados?
3. ¿Sus facturas mezclan servicios y venta de bienes?
4. ¿Calculan hoy la retención sobre base sin IVA o sobre el total de la factura?
5. ¿Con qué UT calculan el sustraendo hoy (la vigente a la fecha de pago)?
6. ¿Pagan en pagos parciales a personas naturales? ¿Cómo aplican el sustraendo?

---

## 3. Numeración de comprobantes (G9 y también IVA)

### 3.1 IVA — lo que dice la norma (✅ art. 16)

- Numeración consecutiva de **14 caracteres: `AAAAMMSSSSSSSS`** (año, mes, secuencial de 8 dígitos).
- ✅ El secuencial **"deberá reiniciarse en caso de superar dicha cantidad"**: la lectura literal es que el único reinicio obligatorio es el desbordamiento, no el cambio de mes.
- Plazo de emisión y entrega: **primeros 2 días hábiles del período de imposición siguiente**.
- Se puede emitir **un único comprobante** que relacione todas las retenciones de la quincena con el mismo proveedor.
- Contenido mínimo (8 ítems): numeración; razón social y RIF del agente; datos del impresor si aplica; fecha de emisión y entrega; razón social y RIF del proveedor; N° de control; N° de factura o nota de débito; monto total, base imponible, impuesto causado e impuesto retenido.
- Se registra en el libro de compras (agente) y en el de ventas (proveedor) en el mismo período de la emisión o entrega.

### 3.2 Hallazgo: nuestro diseño de series no coincide con la norma

`CONVENTIONS.md`/`API.md`/ADR-005 usan `period_key` `YYYYMM` o `YYYYMM-Q1/Q2` y una serie por `(company, branch?, kind, period_key)`. Dos desajustes:

1. **La quincena no forma parte de la numeración** de la norma; es del enteramiento (art. 14).
2. La norma pide **numeración consecutiva por agente de retención**; con sucursal en la clave habría varias series para el mismo RIF. 🟡

**Propuesta (ADR-018):** `document_series(company_id, kind, reset_policy)` con `reset_policy ∈ {'on_overflow','monthly'}`, **default `on_overflow`** (lectura literal), prefijo `AAAAMM` = mes de **emisión**, sucursal solo informativa. El contador confirma el valor por empresa. Mantener el `UNIQUE (company_id, certificate_number)` ya existente.

### 3.3 ISLR — no hay formato prescrito

- ✅ Decreto 1.808 art. 24: un comprobante **por cada retención**, con "el monto de lo pagado o abonado en cuenta y la cantidad retenida, entre otra información". **No fija formato de numeración ni plazo de entrega** en el texto consultado. (El art. 21 fija el plazo de enteramiento, no el del comprobante.)
- **Propuesta ❓ (decisión del cliente):** serie independiente `ISLR` con el mismo esquema de 14 caracteres para homogeneidad con el IVA, consecutiva por agente, `reset_policy` parametrizable. Reemplaza el formato provisional `ISLR-AAAAMM-######`.
- Contenido mínimo recomendado del comprobante ISLR: agente (razón social, RIF), beneficiario (razón social, RIF), fecha de emisión, fecha de pago/abono, N° de factura y control, concepto y código, base, porcentaje, sustraendo, monto pagado/abonado, monto retenido, período.
- ✅ Art. 24 y 23: además existe una **relación anual** de pagos y retenciones (y comprobante de última retención del ejercicio para ciertos beneficiarios). Hoy **no está en el roadmap**: agregar al backlog (ARCV).

### 3.4 Qué pedir al cliente

1. Un ejemplo anonimizado de comprobante ISLR **y** de comprobante IVA que usan hoy.
2. ¿Su secuencia se reinicia cada mes o continúa? ¿Hay una por sucursal?
3. ¿Hay comprobantes emitidos en el año con numeración mezclada que haya que continuar? (para sembrar el contador inicial en migración)

---

## 4. Permisos y segregación de funciones

### 4.1 Por qué importa legalmente

El agente de retención responde por lo dejado de retener, retenido de menos o enterado con retardo (✅ Decreto 1.808 art. 13; Providencia 0054 art. 18, sanciones del COT). En entes públicos, el funcionario ordenador del pago es el responsable si la orden de pago no manda retener (✅ art. 12). Por eso conviene que **quien prepara no sea quien aprueba y emite**.

### 4.2 Matriz propuesta (rol × acción)

Acciones: **P** preparar/cargar · **R** revisar · **A** aprobar · **E** emitir · **N** anular · **S** sustituir/reemitir · **C** cerrar/reabrir · **Cfg** editar reglas.

| Acción | Administrativo | Contador | Admin sistema | Auditor |
|---|---|---|---|---|
| Importar / registrar documentos y eventos | **P** | P | — | lectura |
| Previsualizar cálculo (`explanation[]`) | ✓ | ✓ | — | ✓ |
| Revisar y aprobar retención calculada | — | **R, A** | — | lectura |
| Emitir comprobante | — | **E** | — | lectura |
| Anular (motivo obligatorio) | — | **N** | — | lectura |
| Sustituir/reemitir | — | **S** | — | lectura |
| Cerrar / reabrir período | — | **C** (reapertura con motivo + segunda aprobación) | — | lectura |
| Editar reglas, catálogos, series | — | **Cfg** | — | lectura |
| Usuarios, empresas, roles | — | — | **✓** | — |

### 4.3 Reglas de sistema (a implementar en `authorize()`)

1. **Cuatro ojos configurable** (`require_four_eyes`, default `true`): el usuario que prepara una retención no puede aprobarla/emitirla. Si la empresa tiene un solo usuario con ambos roles, se permite pero queda auditado como *autoaprobación*.
2. **Anular tiene dos regímenes:** antes de que la retención esté **declarada/enterada** se puede anular (el número queda consumido); después, solo **ajuste/sustitución con efecto en el período corriente** — nunca borrar (ver Providencia 0054 arts. 11 y 12 sobre excesos y retenciones indebidas).
3. El **auditor** nunca escribe; la reapertura exige motivo y queda en bitácora.
4. ❓ Decisión del cliente: ¿el administrativo solo prepara o también emite? Por defecto, **solo el contador emite**.

### 4.4 Preguntas para el cliente

1. ¿Quién prepara, quién revisa, quién aprueba y quién firma/entrega el comprobante hoy?
2. ¿Cuántas personas con perfil contable tiene cada empresa? (define si el cuatro ojos es viable)
3. ¿Quién autoriza una anulación o reapertura?
4. ¿Es entidad pública o privada? (cambia la responsabilidad por la orden de pago)

---

## 5. Archivos y formato (CSV, Z y plantilla XLSX)

### 5.1 ¿La plantilla XLSX es "formato aprobado" o referencia?

La plantilla no es aprobada por defecto: es **referencia hasta que se cotee contra lo que exige la norma**. Usar esta lista (verificada para el comprobante de IVA, art. 16):

| Campo exigido | ¿Está en la plantilla? |
|---|---|
| Numeración `AAAAMMSSSSSSSS` | ☐ |
| Razón social y RIF del agente de retención | ☐ |
| Datos del impresor (si aplica) | ☐ |
| Fecha de emisión **y** de entrega | ☐ |
| Razón social y RIF del proveedor | ☐ |
| N° de control y N° de factura/nota de débito | ☐ |
| Total, base imponible, impuesto causado, impuesto retenido | ☐ |

Para ISLR (art. 24): monto pagado/abonado, cantidad retenida, identificación de las partes + concepto, base, %, sustraendo (recomendado). Para los **libros de compras y ventas**, cotejar contra el capítulo de libros del Reglamento de la Ley del IVA (la fuente está en `fuentes_ERP_Tributario_Lite.md`); 🟡 no cité artículos porque no los verifiqué en esta consulta.

**Regla de decisión:** si la plantilla contiene todos los campos exigidos, se adopta como formato aprobado y se firma en `anexos/checklist-F0.md`; si falta alguno, se corrige la plantilla y se versiona.

### 5.2 Paquete mínimo de muestras a solicitar

| Archivo | Contenido | Detalle |
|---|---|---|
| CSV compras legacy | 1 mes real (ideal 2) | Con NC, ND, exentas, importaciones, retención IVA e ISLR incluidas |
| CSV ventas / Z | 1 mes de la misma empresa | Con Z de al menos 2 sucursales/máquinas |
| Ficha de origen | Una por archivo | Sistema y versión, cómo se exporta, separador, encoding, formato de fecha, decimal |
| Un comprobante IVA y uno ISLR | Reales anonimizados | Para validar numeración y contenido |
| Libros y resumen del mismo mes | Hechos en Excel por el contador | Es el **oráculo** para M2 |

**Anonimización:** mantener estructura y consistencia (mismo RIF falso para el mismo tercero, mismos importes); reemplazar nombres, RIF reales y domicilios.

### 5.3 Datos de la Z que el parser debe exigir

N° de Z, fecha, serial/registro de la máquina, **primera y última factura** del rango, base y IVA por alícuota, exento, NC/ND del día y total. Sin el rango no se puede validar el salto de numeración.

---

## 6. Hallazgos adicionales que cambian el diseño

| # | Hallazgo | Impacto | Propuesta |
|---|---|---|---|
| H1 | ✅ La retención de IVA solo la practican **sujetos pasivos especiales** (art. 1) y el enteramiento es **quincenal** (art. 14) | El módulo IVA debe activarse por empresa; el calendario depende de la condición de especial | Flag `agente_retencion_iva` + calendario por empresa |
| H2 | ✅ Art. 15: el agente debe **declarar en el Portal Fiscal** las compras sujetas a retención "siguiendo las especificaciones técnicas del SENIAT" (incluso sin operaciones) | No hay exportador a portal en el roadmap | Backlog: exportadores TXT (IVA) y XML (ISLR); ❓ confirmar si el cliente lo quiere en v1 |
| H3 | ✅ Art. 3: 13 exclusiones (formales, caja chica ≤ 20 U.T., viáticos, servicios domiciliados, entes públicos...) y art. 5: **100 %** si el proveedor no está en el RIF/portal o la factura no cumple requisitos | El motor necesita atributos del proveedor con fecha de consulta | Campos en `party_tax_profiles`: formal, excluido, retención 100 %, `consulted_at` |
| H4 | 🟡 IGTF (3 % en pagos en divisas): no aparece en ningún documento del proyecto | Puede contaminar libros/Z si se mezcla con IVA | Confirmar con el contador cómo se registra y excluirlo de la base |
| H5 | ✅ Art. 16: "días hábiles" | Necesita calendario de feriados | Tabla `business_calendar` editable |
| H6 | ✅ Art. 24/23 Decreto 1.808: relación anual y comprobante final del ejercicio | No está en el roadmap | Backlog v1.1 |
| H7 | 🟡 Facturación digital (SNAT/2024/000102 y 2026/00084 aparecen en la normativa consultada) | Los proveedores pueden emitir por imprenta digital con otra forma de N° de control | Pedir muestras que lo incluyan |

---

## 7. Propuesta de nuevos ADR (para anexar a `DECISIONS.md`)

**ADR-017 — Evento de retención = abono en cuenta o pago (lo primero)**
Fecha: 2026-10-01 · Estado: Propuesta (pendiente de validación del contador)
*Contexto:* Providencia 0054 art. 13 y Decreto 1.808 art. 1. *Decisión:* `settlement_events` con `event_type ∈ {payment, account_credit}`; la retención nace en el primer evento que cubre cada porción; vigencia de reglas con `event_date`. *Consecuencias:* migrar `payments`; ajustar `issue-islr.ts`; fecha de registro del CSV como abono inferido.

**ADR-018 — Series de comprobantes configurables**
Estado: Propuesta. *Decisión:* serie por (empresa, tipo) con `reset_policy` (`on_overflow` por defecto), prefijo `AAAAMM` de emisión, sucursal informativa. *Consecuencias:* reemplaza `period_key` con quincena; afecta ADR-005, API y CONVENTIONS.

**ADR-019 — Catálogo ISLR por beneficiario y vigencia, habilitado por empresa**
Estado: Propuesta. *Decisión:* §2.6; PNNR/PJND solo registro en v1. *Consecuencias:* UT, factor y base (con o sin IVA) como parámetros de regla, no constantes.

**ADR-020 — Segregación de funciones configurable**
Estado: Propuesta. *Decisión:* §4.3, cuatro ojos por defecto; anulación vs ajuste según estado de enteramiento.

---

## 8. Cambios sugeridos a los documentos vivos

| Documento | Cambio |
|---|---|
| `DATABASE.md` | Añadir `settlement_events`, `settlement_allocations`, `islr_concepts`, `islr_concept_rates`, `company_islr_concepts`, `business_calendar`; cambiar serie a `reset_policy`; `party_tax_profiles` con atributos H3; líneas de retención múltiples por factura |
| `API.md` | `createPayment/allocatePayment` → `createSettlementEvent` + `allocate`; documentar `reset_policy`; estado "declarada/enterada" en retenciones |
| `CONVENTIONS.md` | Corregir `period_key` (quita `YYYYMM-Q1/Q2`); regla "vigencia con `event_date`" |
| `SECURITY.md` | Matriz de §4.2 y reglas §4.3 |
| `TODO.md` | G2, G9 y permisos pasan a 🧪 con este memo; añadir backlog H2, H4, H6 |
| `CHANGELOG.md` | `2026-10-01: Asesoría F0 — evento de retención, series de comprobantes, catálogo ISLR, permisos y muestras; ADR-017–020 propuestos. Sin firma fiscal.` |

---

## 9. Cuestionario consolidado para la sesión con el contador

| # | Pregunta | Opciones | Bloquea |
|---|---|---|---|
| 1 | ¿Contabilidad por causación o caja? | A causación · B caja · C mixta | G2 |
| 2 | ¿La fecha de registro del legacy equivale al abono en cuenta? | Sí · No · Depende | G2 |
| 3 | ¿Base de ISLR sin IVA o con IVA? | A sin IVA · B total facturado | F2 |
| 4 | Sustraendo en pagos parciales PNR | A en cada pago · B una vez por factura | F4 |
| 5 | UT aplicable a la retención | A vigente a fecha de retención · B otra | F4 |
| 6 | Mínimos de PJD (art. 9 §2) | A sin mínimo · B mínimo en U.T. | F4 |
| 7 | Conceptos ISLR que paga la empresa | Checklist §2.2 | F4 |
| 8 | ¿Paga a no residentes/no domiciliados? | Sí/No | Alcance v1 |
| 9 | Secuencial IVA: ¿se reinicia mensualmente? | A solo al desbordar · B mensual | F4 |
| 10 | Formato de numeración ISLR | A como IVA · B otro (adjuntar ejemplo) | G9 |
| 11 | ¿La empresa es sujeto pasivo especial/agente de IVA? | Sí/No (por empresa) | H1 |
| 12 | ¿Quién emite y quién aprueba? | Matriz §4.2 | Permisos |
| 13 | ¿Anulación después de enterada? | Ajuste en período corriente · otro | F4/F6 |
| 14 | ¿Quieren exportar TXT/XML al Portal Fiscal en v1? | Sí/No | Alcance |
| 15 | ¿IGTF aparece en sus facturas? ¿Cómo se registra? | — | Libros |
| 16 | ¿La plantilla XLSX cumple los campos de §5.1? | Sí/No por campo | Formato |
| 17 | Redondeo: método y etapa (tras "8 cifras significativas") | Por línea/documento/período | ADR-014 |
| 18 | Fecha y tipo de tasa BCV, y diferencias cambiarias | — | ADR-013 |

---

## 10. Fuentes consultadas y limitaciones

- Decreto 1.808 (texto completo): https://docs.cachicamo.app/fiscal/decreto-1808-retenciones-islr-1997
- Providencia SNAT/2025/000054 (texto completo): https://docs.cachicamo.app/fiscal/providencia0054-retencion-iva-2025
- Tabla de retenciones ISLR UT 43: https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/tabla-de-retenciones-del-islr-ut-43-2025.pdf
- UT vigente e histórico: https://docs.cachicamo.app/fiscal/historico-unidad-tributaria
- Retenciones y comprobantes (operativa): https://docs.cachicamo.app/fiscal/retentions
- Base de retención en servicios (criterio profesional): https://gerenciaytributos.blogspot.com/2025/05/retencion-ISLR-facturas-de-servicios-y-ventas-no-asociadas.html
- Criterio sobre abono en cuenta (jurisprudencia de instancia): https://vlexvenezuela.com/vid/insecticidas-internacionales-seniat-288472034

**Limitaciones:** (1) se trabajó con transcripciones, no con la Gaceta Oficial; (2) no se verificó fuente primaria sobre base con/sin IVA ni sobre la UT posterior a junio de 2025; (3) no se leyó el `.xlsx` de formatos ni los CSV reales; (4) no se verificó el Reglamento de la Ley del IVA ni la Ley del IGTF; (5) el criterio sobre abono en cuenta en ISLR descansa en una decisión de instancia, no en la Sala Político-Administrativa. Todo lo marcado 🟡 requiere confirmación del contador antes de pasar a `Aceptada`.
