# Pendientes de implementación — ERP-TributarioLite

> **Estado:** resumen de trabajo, no sustituye la fuente de verdad.  
> **Fecha:** 2026-10-01  
> **Fuentes:** `docs/TODO.md`, `docs/anexos/checklist-F0.md` y `blueprint/ROADMAP-ERP-TributarioLite.md`.  
> **Stack vigente:** Next.js + PostgreSQL + Drizzle; no usar Prisma ni Docker.

La implementación base está avanzada, pero el proyecto todavía no está listo para cerrar las fases fiscales ni para salir a producción. Los principales bloqueos son la aprobación de reglas por el contador, la validación con muestras reales y la aceptación operativa. F0 continúa abierta; sin matriz fiscal firmada y escenarios dorados aprobados no se cierra F2.

## 1. F0 — Cierre de línea base fiscal

### Aprobaciones y entregables

- [ ] Completar, cotejar con fuentes normativas y firmar la Matriz de Reglas v1.
- [ ] Revisar los 17 escenarios candidatos existentes, normalizar unidades y porcentajes, corregir inconsistencias como ISLR-09 y obtener 30–50 casos resueltos y firmados por el contador.
- [ ] Convertir únicamente escenarios aprobados en fixtures dorados ejecutables; mantener los candidatos sin firma fuera del conjunto de pruebas doradas.
- [ ] Validar el XLSX disponible como golden master y recibir al menos un mes de CSV del sistema legacy y archivos Z, anonimizados cuando corresponda.
- [ ] Identificar empresas piloto, condiciones fiscales, sucursales y máquinas fiscales.
- [ ] Registrar cada decisión como aprobada, modificada, validada o pendiente, con evidencia, responsable y fecha.

### Decisiones aún abiertas

- [ ] **G1 — Período IVA:** confirmar el período por empresa y cotejarlo con su condición fiscal y el calendario aplicable.
- [ ] **G2 — Pago o abono en cuenta:** validar el asiento que acredita el abono, fecha e importe, anticipos y parcialidades, atribución de base por porción, sustraendo ISLR y correspondencia con el legacy. La configuración técnica y la comparación dual no constituyen aprobación fiscal. IVA aún no consume eventos.
- [ ] **G4 — Moneda extranjera:** determinar fecha y tipo de tasa BCV, tratamiento de diferencias cambiarias y ejemplos de aplicación.
- [ ] **G7 — Libro de Ventas:** definir la fuente por sucursal/período, convivencia de facturas individuales y Z, prevención de duplicidad y aportar Z reales.
- [ ] **G8 — Redondeo:** precisar qué significa “8 cifras decimales significativas”, método, etapa (línea/documento/período), precisión monetaria final, tolerancia y ejemplos.
- [ ] **G9 — Numeración:** aprobar formato y reinicio de comprobantes ISLR; cotejar también la política IVA y obtener comprobantes reales anonimizados.
- [ ] **G11/G12 — Pagos y calendario:** confirmar catálogo y alcance de métodos/cuentas de pago, exclusión de tesorería, obligaciones cubiertas, fuente del calendario y alertas.
- [ ] **Roles:** aprobar quién prepara, revisa, emite, anula y reemite; confirmar si se requiere control de cuatro ojos y si es viable por empresa.

## 2. Funcionalidad y reglas fiscales pendientes

- [ ] **G3 — Retenciones recibidas:** diseñar e implementar el registro de retenciones recibidas, sus soportes y su efecto en el resumen de IVA.
- [ ] **Catálogos tributarios:** completar la edición de reglas por el contador y cargar tasas/conceptos solo después de aprobar la matriz, fuentes y vigencias.
- [ ] **G2:** completar el soporte fiscal de pagos parciales, base atribuible por porción y sustraendo según decisión firmada; definir y validar el consumo de eventos por IVA. No codificar una regla definitiva antes de esa aprobación.
- [ ] **G7 / modo Z:** terminar y validar libros en modo Z contra archivos reales y cerrar la conciliación con facturas por sucursal.
- [ ] **Perfiles de importación:** implementar perfiles de mapeo guardables por empresa/fuente si los formatos reales del legacy lo requieren.
- [ ] **Ajustes post-cierre:** evaluar e implementar `fiscal_adjustments` si la reapertura no satisface el procedimiento aprobado por el cliente.
- [ ] **Plazos de entrega:** obtener el valor aprobado para los plazos de entrega de comprobantes y configurar las alertas correspondientes.

## 3. Reportes y comprobantes

- [ ] Ejecutar el spike de PDF/Excel fiel a los formatos aprobados.
- [ ] Comparar Excel celda a celda con el XLSX validado y completar snapshots/regresión visual de PDF.
- [ ] Validar totales, cortes y conciliación de reportes usando un período real.
- [ ] Confirmar que los reportes cerrados se regeneran de forma reproducible.

## 4. Pruebas de aceptación

- [ ] Lograr 100 % de aprobación para los escenarios dorados firmados y ejecutar las pruebas de propiedades del motor.
- [ ] Completar pruebas automatizadas de aislamiento entre empresas y autorización rol×empresa.
- [ ] Verificar entre 50 y 100 emisiones concurrentes sin duplicados ni huecos de numeración.
- [ ] Completar E2E por rol: importar, validar, emitir, cerrar y descargar.
- [ ] Comparar un período completo en Excel y en el sistema; exigir diferencias cero o documentadas y aprobadas.

## 5. F7 — Operación y go-live

- [ ] Completar la migración histórica y conciliarla contra Excel.
- [ ] Configurar y verificar un rol de base de datos de mínimo privilegio para la aplicación.
- [ ] Asegurar backups cifrados fuera del servidor y ejecutar/documentar un restore drill.
- [ ] Completar hardening de seguridad, UAT por rol, capacitación y manuales operativos.
- [ ] Obtener la firma del contador y del responsable del cliente en el checklist de go-live.

## Ya implementado, pero pendiente de validación fiscal u operativa

- Captura estructural de eventos de pago/abono, configuración G2 fail-closed (`unset` por defecto), previsualización dual ISLR y emisión por convergencia.
- Emisión ISLR, además de la emisión IVA; ambos flujos continúan sujetos a reglas, formatos y datos aprobados.
- Cierre y reapertura de períodos, generación de reportes base y controles técnicos ya descritos en `docs/TODO.md`.

La implementación técnica de estas capacidades no equivale a aprobación fiscal ni cierra F0.

## Orden recomendado

1. Cerrar decisiones F0 y conseguir muestras reales.
2. Aprobar matriz y escenarios dorados.
3. Implementar los cambios de cálculo y reglas que resulten de esas aprobaciones.
4. Validar reportes, importaciones y pruebas de aceptación con un período real.
5. Completar hardening, operación, UAT y firmas de go-live.

## Nota de consistencia documental

`docs/TODO.md` describe la emisión ISLR como implementada en su registro de G2 y en `CHANGELOG.md`, aunque una fila de F4 conserva el texto “Falta ISLR”. Corregir esa fila para evitar que el estado técnico parezca contradictorio; la aprobación fiscal sigue pendiente en cualquier caso.
