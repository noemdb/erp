# ROADMAP DE IMPLEMENTACIÓN — CUARTA REVISIÓN
## ERP-TributarioLite — Cierre funcional, UAT, cutover y go-live

**Fecha:** 2026-10-05  
**Objetivo:** llevar la implementación desde el estado actual hasta una aceptación formal y un go-live controlado.

---

# 1. Objetivo de esta cuarta revisión

La cuarta revisión no debe convertirse en una nueva ronda de documentación abstracta.

El objetivo es pasar de:

> “el sistema está implementado y técnicamente preparado”

a:

> “el sistema fue probado con reglas fiscales decididas por el cliente, datos reales, casos de uso representativos, resultados comparados contra Excel/libros de referencia, evidencia reproducible y aceptación formal”.

El criterio rector para esta fase es:

**decisión fiscal → implementación → prueba dorada → prueba operativa → evidencia → aceptación.**

---

# 2. Estado de partida

## 2.1 Lo que ya puede considerarse infraestructura de implementación

- Next.js 16 + React 19 + Tailwind 4.
- PostgreSQL ≥16.
- Drizzle.
- Sesiones DB propias.
- Server Actions + Route Handlers.
- Motor fiscal puro y versionado.
- Multiempresa + aislamiento por tenant.
- Importación por staging.
- Compras, ventas, NC/ND, pagos/eventos.
- Retenciones IVA/ISLR.
- Libros, resumen y conciliación.
- Cierre/reapertura.
- Auditoría append-only.
- PDF/Excel.
- Playwright y pruebas P0.
- Intake de muestras.
- Escáner de secretos reactivado.
- Purge del incidente `serverc`.

## 2.2 Lo que todavía impide declarar “listo”

1. Decisiones fiscales externas sin firma.
2. Muestras reales M-1…M-4.
3. Matriz de reglas v1.
4. Dorados firmados.
5. G8/redondeo/tolerancia.
6. G2/criterio de abono y consumo de eventos.
7. G9/series y reinicios.
8. Excel real y paridad.
9. Mes real de libros.
10. M5 de reconciliación.
11. UAT formal.
12. Hardening T12/T13.
13. Alineación documental T14.
14. Tablero operativo T15.

---

# 3. Principio de ejecución

## 3.1 No desarrollar contra una decisión no firmada

Toda decisión que afecte cálculo fiscal debe seguir:

1. caso presentado;
2. alternativas identificadas;
3. decisión del contador/cliente;
4. RDF firmado;
5. matriz de regla actualizada;
6. implementación;
7. golden;
8. prueba;
9. aceptación.

**Nunca:** interpretar una conversación verbal como autorización para cambiar el motor.

---

# 4. Roadmap maestro

## FASE A — Preparación de cancha externa

### A1. Cerrar T01 — respuestas F0-01

**Responsable:** contador/cliente.

Debe quedar una matriz:

| ID | Tema | Decisión | Estado | Fecha | Responsable | Evidencia |
|---|---|---|---|---|---|---|
| P-01 | ... | ... | APROBADO/MODIFICAR/PENDIENTE | ... | ... | ... |

### Gate A1

No continuar a reglas definitivas si existen preguntas fiscales críticas en estado ambiguo.

---

## FASE B — Captura de datos reales

### B1. Cerrar T02 — M-1…M-4

Solicitar:

- M-1: CSV de al menos un mes.
- M-2: al menos un Z por máquina, con rango/salto.
- M-3: libros del mismo período.
- M-4: XLSX original utilizado por el cliente.

### B2. Intake

Ejecutar:

- `import:autodetect`
- `golden:inspect`

Clasificar cada muestra:

- REAL
- SINTÉTICA
- INCOMPLETA
- NO UTILIZABLE

### Gate B

No utilizar una muestra sintética como sustituto silencioso de una muestra real.

Si M-2 no llega, dejar explícitamente el escenario bloqueado.

---

# 5. FASE C — Sesión práctica de decisiones fiscales

## C1. T03 — Sesión 1 Tier A

Esta es la sesión crítica de la cuarta revisión.

### Objetivo

Resolver, mediante casos concretos, los puntos:

- G8.
- G2-a.
- G2-b.
- G2-c.
- G2-d.
- base ISLR.
- UT.
- mínimos.
- G9.
- G1.

### Resultado obligatorio

No basta con “acordamos”.

Cada caso debe producir:

**RDF — Registro de Decisión Fiscal**

Campos mínimos:

```text
RDF-ID
Fecha
Caso
Datos de entrada
Pregunta
Alternativas consideradas
Decisión
Fundamento aportado por cliente/contador
Fórmula
Redondeo
Momento fiscal
Ejemplo numérico
Resultado esperado
Regla afectada
Impacto en sistema
Responsable que aprueba
Firma/acuse
```

---

# 6. SESIÓN PRÁCTICA PROPUESTA

## Duración recomendada

3 horas 30 minutos.

### Bloque 1 — Contexto y control de cambios
15 min.

### Bloque 2 — Configuración de empresa y tercero
20 min.

### Bloque 3 — Compra + IVA + pago
25 min.

### Bloque 4 — Retención IVA
25 min.

### Bloque 5 — Retención ISLR
25 min.

### Bloque 6 — Abonos, pagos parciales y G2
35 min.

### Bloque 7 — Ventas + NC/ND + máquina fiscal/Z
25 min.

### Bloque 8 — Importación CSV + staging
20 min.

### Bloque 9 — Libros + Excel + conciliación
25 min.

### Bloque 10 — Cierre, reapertura y auditoría
20 min.

### Bloque 11 — Decisiones pendientes y firma
20 min.

---

# 7. Casos de uso prioritarios para la sesión

## CU-01 — Alta de empresa

### Actor
Admin sistema.

### Precondición
Usuario autenticado.

### Ejecutar

1. Crear empresa.
2. Configurar datos fiscales.
3. Crear sucursal.
4. Configurar período.
5. Crear usuarios por rol.
6. Asociar usuarios a empresa.
7. Confirmar aislamiento.

### Verificar

- empresa visible solo donde corresponde;
- RIF dual correcto;
- período abierto;
- roles efectivos;
- auditoría de creación.

### Evidencia

Capturas + IDs + registro de auditoría.

---

## CU-02 — Alta de tercero con RIF dual

### Actor
Administrativo.

### Ejecutar

1. Crear proveedor.
2. Registrar identificación fiscal.
3. Registrar perfil tributario.
4. Crear vigencia.
5. Intentar introducir una vigencia incompatible.

### Verificar

- RIF dual correctamente validado;
- solapamientos rechazados;
- datos disponibles para cálculo.

---

## CU-03 — Compra gravada con IVA

### Actor
Administrativo.

### Ejecutar

1. Seleccionar proveedor.
2. Registrar documento.
3. Registrar fecha fiscal.
4. Registrar base imponible.
5. Registrar alícuota.
6. Registrar IVA.
7. Guardar.
8. Previsualizar resultado fiscal.

### Verificar

- `base_imponible`;
- alícuota como fracción;
- monto IVA;
- período fiscal;
- versión de regla;
- explicación del cálculo.

---

## CU-04 — Pago completo

### Actor
Administrativo/Contador.

### Ejecutar

1. Registrar pago.
2. Asociarlo al documento.
3. Consultar evento de liquidación.
4. Ejecutar preview fiscal.

### Verificar

- evento creado;
- asignación correcta;
- monto disponible;
- trazabilidad.

---

## CU-05 — Pago parcial

### Objetivo
Validar G2.

### Ejecutar

1. Documento por monto superior al pago.
2. Registrar pago parcial.
3. Registrar saldo.
4. Repetir pago.
5. Consultar sustraendo.
6. Comparar preview.

### Verificar

- criterio de abono aplicado;
- porción correcta;
- sustraendo correcto;
- IVA derivado de eventos;
- estado fail-closed cuando falte configuración.

### Evidencia

Resultado numérico firmado.

---

## CU-06 — Abono en cuenta

### Ejecutar

1. Crear documento.
2. Registrar evento `account_credit`.
3. Registrar fecha.
4. Asociar monto.
5. Ejecutar motor.

### Pregunta fiscal obligatoria

¿Qué evento determina la fecha fiscal cuando existen pago y abono?

La respuesta debe provenir de T03/RDF.

---

## CU-07 — Retención IVA

### Actor
Contador.

### Ejecutar

1. Seleccionar factura.
2. Seleccionar base.
3. Aplicar alícuota.
4. Emitir comprobante.
5. Consultar número.
6. Generar PDF.
7. Registrar entrega.

### Verificar

- numeración;
- cálculo;
- trazabilidad;
- PDF;
- auditoría;
- inmutabilidad.

---

## CU-08 — Retención ISLR

### Actor
Contador.

### Ejecutar

1. Seleccionar factura/documentos.
2. Seleccionar concepto.
3. Registrar base gravable.
4. Aplicar porcentaje.
5. Emitir.
6. Generar PDF post-commit.
7. Consultar hash.

### Verificar

- `base_gravable`;
- UT;
- mínimo;
- sustraendo;
- regla;
- versión;
- PDF;
- hash;
- auditoría.

---

## CU-09 — Numeración y reinicio G9

### Ejecutar

1. Crear serie.
2. Emitir comprobante.
3. Emitir varios consecutivos.
4. Simular/certificar cambio de período.
5. Verificar reinicio según decisión.
6. Intentar duplicación.

### Verificar

- no hay huecos;
- no hay duplicados;
- reinicio conforme al RDF;
- cotejo con IVA;
- auditoría.

---

## CU-10 — Nota de crédito

### Ejecutar

1. Seleccionar documento origen.
2. Crear NC.
3. Registrar motivo.
4. Aplicar impacto fiscal.
5. Recalcular resumen.

### Verificar

- NC no se trata como devolución física;
- documento origen trazable;
- impacto correcto;
- libro actualizado.

---

## CU-11 — Nota de débito

Mismo protocolo de CU-10, verificando incremento de base/IVA según regla aprobada.

---

## CU-12 — Z / máquina fiscal

### Ejecutar

1. Importar Z real.
2. Validar máquina.
3. Validar rango.
4. Validar salto.
5. Asociar sucursal.
6. Confirmar período.

### Verificar

- mes correcto;
- sucursal correcta;
- no duplicidad;
- saltos detectados;
- perfil solo si realmente lo exige el layout.

---

## CU-13 — Importación CSV

### Ejecutar

1. Subir CSV.
2. Detectar layout.
3. Crear staging.
4. Revisar errores.
5. Corregir fila.
6. Confirmar importación.
7. Repetir mismo archivo.

### Verificar

- `sha256`;
- idempotencia;
- errores;
- staging;
- confirmación transaccional;
- no duplicación.

---

## CU-14 — Libros y Excel

### Ejecutar

1. Seleccionar período.
2. Generar libro.
3. Generar resumen.
4. Exportar Excel.
5. Comparar contra Excel del contador.
6. Registrar D1–D5.
7. Resolver diferencias.

### Gate

**D1 abiertas = 0** antes de cutover.

---

## CU-15 — Cierre fiscal

### Ejecutar

1. Abrir período.
2. Ejecutar checklist.
3. Confirmar pendientes.
4. Generar cierre.
5. Obtener `closure_hash`.
6. Intentar modificar operación.

### Verificar

- modificación bloqueada;
- hash reproducible;
- auditoría;
- estado `closed`.

---

## CU-16 — Reapertura

### Actor
Contador autorizado.

### Ejecutar

1. Solicitar reapertura.
2. Registrar motivo.
3. Autorizar.
4. Reabrir.
5. Registrar modificación.
6. Volver a cerrar.

### Verificar

- cuatro ojos cuando aplique;
- auditoría;
- motivo;
- nuevo hash;
- trazabilidad completa.

---

## CU-17 — Auditoría

### Actor
Auditor.

### Ejecutar

Buscar:

- creación;
- modificación;
- emisión;
- anulación;
- reapertura;
- importación;
- configuración de reglas.

### Verificar

El auditor debe poder reconstruir:

**quién → qué → cuándo → empresa → documento → regla → resultado.**

---

# 8. Matriz de pruebas UAT

| ID | Caso | Rol | Resultado esperado | Evidencia | Estado |
|---|---|---|---|---|---|
| UAT-01 | Alta empresa | Admin | Empresa operativa | captura/audit | |
| UAT-02 | Tercero/RIF | Admin | Perfil válido | captura/audit | |
| UAT-03 | Compra IVA | Admin | Cálculo correcto | resultado | |
| UAT-04 | Pago completo | Admin | Evento correcto | evento | |
| UAT-05 | Pago parcial | Contador | G2 correcto | RDF/golden | |
| UAT-06 | Abono | Contador | Criterio correcto | RDF/golden | |
| UAT-07 | Retención IVA | Contador | Comprobante válido | PDF/hash | |
| UAT-08 | Retención ISLR | Contador | Cálculo válido | PDF/hash | |
| UAT-09 | Serie G9 | Contador | Secuencia correcta | serie | |
| UAT-10 | NC | Contador | Impacto correcto | libro | |
| UAT-11 | ND | Contador | Impacto correcto | libro | |
| UAT-12 | Z real | Admin | Importación válida | staging | |
| UAT-13 | CSV | Admin | Importación idempotente | batch | |
| UAT-14 | Libros | Contador | Paridad | Excel | |
| UAT-15 | Cierre | Contador | Hash y bloqueo | cierre | |
| UAT-16 | Reapertura | Contador | Flujo auditado | audit | |
| UAT-17 | Auditoría | Auditor | Trazabilidad | consulta | |
| UAT-18 | RBAC | Todos | Acceso correcto | evidencia | |
| UAT-19 | Multiempresa | Admin | Aislamiento | evidencia | |
| UAT-20 | Restore | Admin sistema | RPO/RTO cumplidos | acta | |

---

# 9. Golden cases

## Lote mínimo inicial

Los 17 candidatos existentes deben convertirse en:

- caso reproducible;
- entradas congeladas;
- resultado esperado;
- regla;
- versión;
- explicación;
- SHA-256;
- firma.

Agregar como mínimo:

- ISLR-07;
- ISLR-09;
- ABONO-01;
- ABONO-02;
- ABONO-03.

## Objetivo

30–50 dorados firmados.

### Regla de salida

No declarar F2 cerrado mientras exista un golden fiscal requerido en rojo.

---

# 10. Tareas técnicas

## T06 — Redondeo y tolerancia

Ejecutar después de RDF G8.

### Entregables

- ADR-014 actualizado;
- código sin `round2` provisional;
- tolerancia única;
- tests;
- dorados G8;
- `g8:calibrate` limpio.

---

## T07 — G2 + eventos

Ejecutar después de RDF G2.

### Entregables

- criterio configurado;
- sustraendo PNR;
- IVA consumiendo `settlement_events`;
- preview dual;
- `g2:divergence` limpio;
- ABONO-01…03 verdes.

---

## T08 — Catálogos/Z/perfiles

Ejecutar con T04 + muestras.

### Entregables

- catálogos reales;
- Z real;
- perfiles exigidos por layouts;
- caso real reproducido.

---

## T09 — Excel/paridad/render

Ejecutar con M-4.

### Entregables

- mapa de celdas;
- plantilla original;
- generadores;
- paridad;
- deudas de render cerradas;
- `summary/v1` resuelto;
- `pdf_sha256` decidido.

---

## T10 — Mes real + M5

### Objetivo

Ejecutar un período real completo en paralelo:

**ERP vs Excel/libros del contador.**

### Registrar

- total documentos;
- total bases;
- total IVA;
- total retenciones;
- total libros;
- diferencias D1–D5;
- diferencias aprobadas;
- diferencias abiertas.

### Gate

**D1 abiertas = 0.**

---

# 11. T11 — UAT, cutover y go-live

T11 debe ser una ceremonia de aceptación, no una sesión de descubrimiento.

## Entrada

- T04 firmado.
- 30 dorados mínimo.
- M5 firmado.
- D1 = 0.
- T12/T13 según nivel de riesgo acordado.
- documentación actualizada.
- checklist verde.

## Ejecución

1. UAT por rol.
2. Validación multiempresa.
3. Validación RBAC.
4. Drill RPO/RTO.
5. ORR.
6. Cutover.
7. Smoke test.
8. Acta.

## Salida

`ACTA-ACEPTACION.md` firmada.

---

# 12. Hardening paralelo

## T12 — Secretos

No depende de T03/T04.

Debe ejecutarse cuanto antes.

### Verificar

- DB owner rotado;
- `app_runtime` rotado;
- `AUTH_SECRET`;
- `FILE_SIGNING`;
- almacenamiento;
- seeds;
- clave antigua rechazada;
- registros revisados.

---

## T13 — Least privilege + restore

También puede ejecutarse en paralelo.

### Verificar

- `DB_LEAST_PRIVILEGE=true`;
- staging;
- restore real;
- RPO;
- RTO;
- evidencia;
- firma.

---

## T14 — Alineación documental

Debe ser corto y obligatorio.

Actualizar:

- ARCHITECTURE.md;
- API.md;
- E-3 `origin`;
- render fuera de TX;
- auth propio;
- pg-boss diferido;
- guardia `--matrix-hash`.

---

## T15 — Tablero semanal

Métricas:

- decisiones firmadas / requeridas;
- dorados firmados / 30;
- cobertura de reglas;
- incidentes;
- desviación real;
- tareas vencidas;
- spillover S1→S2.

---

# 13. Orden recomendado real

## Camino crítico

```text
T01
 ↓
T03 ───────────────┐
 ↓                 │
T04                │
 ↓                 │
T05                │
 ↓                 │
T08 ───────┐       │
T06 ───────┤       │
T07 ───────┤       │
T09 ───────┤       │
           ↓       │
          T10 ←────┘
           ↓
          T11
           ↓
        GO-LIVE
```

## Paralelo

```text
T02 ─────→ T08/T09/T10
T12 ─────→ independiente
T13 ─────→ independiente
T14 ─────→ independiente
T15 ─────→ independiente
```

---

# 14. Corrección importante de planificación

Existe una inconsistencia que debe resolverse antes de congelar el roadmap:

El consolidado declara **G4** como bloqueo activo, pero T03/T06/T07/T08/T09/T10 no lo incluyen explícitamente en su ruta de resolución.

Por tanto, en la próxima reunión debe decidirse una de estas dos opciones:

### Opción A — G4 no pertenece al alcance de v1

Registrar formalmente la exclusión/diferimiento y eliminarlo de los bloqueos de go-live.

### Opción B — G4 sí pertenece a v1

Agregar:

- caso práctico G4;
- RDF;
- regla;
- implementación;
- golden;
- UAT;
- gate.

**No dejar G4 en un estado ambiguo.**

---

# 15. Gate de go-live

El sistema solamente puede declararse listo cuando:

## Fiscal

- [ ] T01 firmado.
- [ ] T03 ejecutado.
- [ ] G1 decidido.
- [ ] G2 decidido.
- [ ] G8 decidido.
- [ ] G9 decidido.
- [ ] G4 decidido como incluido o diferido formalmente.
- [ ] matriz v1 firmada.

## Datos

- [ ] M-1 validado.
- [ ] M-2 validado.
- [ ] M-3 validado.
- [ ] M-4 validado.

## Motor

- [ ] 30+ dorados.
- [ ] 100% de dorados requeridos verdes.
- [ ] divergencia G2 limpia.
- [ ] calibración G8 limpia.

## Reportes

- [ ] Excel real comparado.
- [ ] libros comparados.
- [ ] D1–D5 resueltas.
- [ ] M5 firmado.

## Seguridad

- [ ] secretos rotados.
- [ ] least privilege probado.
- [ ] restore drill probado.
- [ ] RPO/RTO registrados.
- [ ] scanner limpio.

## Operación

- [ ] UAT por rol.
- [ ] manuales actualizados.
- [ ] runbooks actualizados.
- [ ] ORR completado.
- [ ] cutover ensayado.
- [ ] smoke test verde.

## Aceptación

- [ ] acta firmada.
- [ ] responsable funcional identificado.
- [ ] responsable técnico identificado.
- [ ] responsable operativo identificado.

---

# 16. Sesión práctica: hoja del facilitador

Para cada caso, el facilitador debe preguntar exactamente:

### A. ¿Qué hecho ocurrió?

No comenzar por la pantalla.

### B. ¿Qué fecha determina el efecto fiscal?

Registrar la fecha y el fundamento.

### C. ¿Cuál es la base?

Usar el término ubicuo correspondiente:

- `base_imponible`;
- `base_gravable`.

### D. ¿Cuál es la alícuota?

Registrar como porcentaje/fracción según contrato.

### E. ¿Qué monto resulta?

Registrar con 2 decimales.

### F. ¿Qué redondeo aplica?

No asumir.

### G. ¿Qué evento dispara el cálculo?

Especialmente para G2.

### H. ¿Qué documento se genera?

Registrar tipo, serie y número.

### I. ¿Qué debe aparecer en el libro?

Registrar resultado esperado.

### J. ¿Qué debe quedar auditado?

Registrar actor, fecha, operación y versión.

### K. ¿El contador lo acepta?

Solo una respuesta formal:

- APROBADO;
- MODIFICAR;
- PENDIENTE.

---

# 17. Evidencia mínima por caso

Cada caso UAT debe conservar:

```text
Caso:
Actor:
Empresa:
Período:
Datos de entrada:
Regla:
rule_version_id:
Resultado esperado:
Resultado obtenido:
Diferencia:
Capturas:
ID de documento:
ID de evento:
ID de comprobante:
SHA-256:
Auditoría:
Estado:
Aprobador:
Fecha:
```

---

# 18. Registro de incidencias

| ID | Caso | Severidad | Descripción | Esperado | Obtenido | Acción | Responsable | Estado |
|---|---|---|---|---|---|---|---|---|
| INC-001 | | P0/P1/P2/P3 | | | | | | |

### Clasificación

**P0:** impide operación o produce resultado fiscal incorrecto.

**P1:** rompe una función crítica sin alternativa aceptable.

**P2:** defecto funcional con workaround.

**P3:** defecto cosmético/documental.

### Regla

P0/P1 abiertos bloquean go-live.

P2 requiere decisión explícita.

P3 puede pasar a backlog post-go-live si no afecta cumplimiento.

---

# 19. Plan de trabajo sugerido

## Sprint 0 — Preparación

- cerrar T01;
- obtener M-1…M-4;
- ejecutar T12;
- iniciar T13;
- cerrar T14;
- preparar sesión práctica;
- congelar entorno de UAT.

## Sprint 1 — Decisiones

- ejecutar T03;
- firmar RDF;
- cerrar G1/G2/G8/G9;
- decidir G4.

## Sprint 2 — Reglas

- T04;
- T06;
- T07;
- primeros dorados.

## Sprint 3 — Datos y reportes

- T08;
- T09;
- completar dorados.

## Sprint 4 — Mes real

- T10;
- M5;
- paralelo Excel;
- D1–D5.

## Sprint 5 — Aceptación

- T11;
- UAT;
- restore;
- ORR;
- cutover;
- go-live.

---

# 20. Artefactos que deben existir al final

> Nota de vigencia (QUINTA_REV Q-06, 2026-10-08): este árbol quedó obsoleto.
> El RDF vive en DB (ADR-034, migración 0023), no en `docs/rdf/RDF-G*.md`;
> la plantilla markdown sigue en `docs/anexos/RDF-plantilla.md`.
> `docs/operacion/`, `docs/tablero-semanal.md` y `docs/goldens/` no existen:
> go-live en `go-live-checklist.md`, bitácora en `docs/anexos/bitacora-diferencias.md`,
> tablero en `pendientes/QUINTA_REV/seguimiento/tablero-semanal.md`.

```text
docs/
├── matriz-reglas-v1.md
├── rdf/
│   ├── RDF-G1-*.md
│   ├── RDF-G2-*.md
│   ├── RDF-G8-*.md
│   └── RDF-G9-*.md
├── fixtures/
│   └── goldens/
├── uat/
│   ├── matriz-uat.md
│   ├── evidencias/
│   └── incidencias.md
├── operacion/
│   ├── go-live-checklist.md
│   ├── cutover.md
│   ├── orr.md
│   └── restore-drill.md
├── acta-aceptacion.md
└── tablero-semanal.md
```

---

# 21. Criterio final de la cuarta revisión

La cuarta revisión debe terminar con una respuesta inequívoca a cinco preguntas:

1. **¿Las reglas fiscales están decididas y firmadas?**
2. **¿El sistema reproduce correctamente los casos dorados?**
3. **¿El sistema reproduce un período real contra los libros/Excel del contador?**
4. **¿Los usuarios pueden ejecutar sus casos de uso críticos y demostrarlo?**
5. **¿Existe evidencia suficiente para asumir operación y soporte?**

Si alguna respuesta es “no”, el estado correcto sigue siendo:

**IMPLEMENTACIÓN EN VALIDACIÓN**, no “LISTO”.

---

# 22. Próximo hito inmediato

La siguiente actividad no debe ser otra revisión documental.

Debe ser:

## SESIÓN PRÁCTICA 1 — FISCAL + OPERATIVA

Entrada:

- F0-01;
- muestras disponibles;
- candidatos de golden;
- entorno de UAT.

Salida:

- RDF firmados;
- decisiones G1/G2/G8/G9;
- decisión G4;
- casos UAT ejecutados;
- incidencias;
- lista exacta de cambios de implementación.

Ese resultado se convierte en la entrada de T04–T10.