# 02 — Roadmap inicial por fases (R0–R5)

> **Estado:** propuesta, no firmada · **Actualizado:** 2026-10-09
> Cada fase cierra con **aceptación verificable**. Nada fiscal se activa sin matriz v1
> firmada + RDF con cobertura (`GATE_NO_RDF`). Al aprobarse una fase, su trabajo entra a
> `docs/TODO.md` (bloque + aceptación) y, si expone/consume API, a `docs/API.md` en el momento.

## Mapa de fases

```
R0 intake ──► R1 períodos+libros ──► R2 comprobantes+correlativo ──► R3 resumen IVA
      │                                                              │
      └──────────────► R4 XML/TXT SENIAT (gated Q14) ◄────────────────┘
                              │
                              ▼
                     R5 cierre + paquete + aceptación mes real
```

| Fase | Objetivo | Reportes que entrega |
|---|---|---|
| R0 | Fijar el contrato: respuestas, muestras, layouts | Ninguno (habilita R1–R4) |
| R1 | Períodos + Libros de Compras/Ventas con totales | R-O1, R-O2, R-E1, R-E2 |
| R2 | Comprobantes + correlativo | R-E4, R-E5, R-E6 |
| R3 | Resumen de IVA con retenciones recibidas | R-O3, R-E3 |
| R4 | Archivos SENIAT (gated) | R-O4, R-E7, R-E8 |
| R5 | Cierre: paquete, checklist, versión, aceptación | Los 8, como paquete de cierre |

Mapeo a F0–F7: R0→F0 · R1→F3/F5 · R2→F4 · R3→F5 (+G3) · R4→nuevo (alcance Q14) · R5→F6/F7.

## R0 — Intake y contrato (sin código fiscal)

- **Alcance:** responder §6 de `01-requerimiento-cliente.md` (G1/G7/G9/Q14, conceptos ISLR,
  layouts TXT/XML, redondeo G8, tasa BCV G4); entregar M-1…M-4 (mes CSV + Z + libros del
  contador + XLSX plantilla); confirmar columnas de libros/resumen contra las 5 pestañas de
  `blueprint/datos/formatos_*.xlsx` (M-4, anonimizado).
- **Aceptación:** tabla §6 completa con APROBADO/MODIFICAR/PENDIENTE + fecha
  (formato pedido F0-01); M-1 parseable por `import:autodetect`, M-2 ≥1 Z por máquina,
  M-3 mismo mes que M-1/M-2, M-4 inventariado con `golden:inspect` sin PII.
- **Sale a:** `docs/anexos/` (matriz v1, checklist-F0, RDFs B1). Sin esto, R1–R4 no arrancan.

## R1 — Períodos + Libros (primero que ve el cliente)

- **Alcance:** `fiscal_periods` `monthly`/`biweekly` por empresa (API `createPeriod`,
  `resolvePeriod`); Libro de Compras y de Ventas por `fiscal_period_id` con totales por
  alícuota/clasificación; modo Z por sucursal (G7); pantalla + PDF/Excel + CSV.
- **Aceptación:** para 1 mes piloto: Libro Compras y Ventas (mensual y Q1/Q2) generados
  desde documentos; totales = suma de líneas (Inv. 8); anochece: regenerar da mismo `sha256`;
  drill-down total→documento→fila CSV; anulados excluidos de totales y listados marcados.
- **Módulos:** `periods`, `fiscal-docs`, `sales`, `imports`, `reporting`, `audit`.

## R2 — Comprobantes + correlativo (solo especiales en este pedido)

- **Alcance:** emisión transaccional IVA/ISLR multi-factura (preview con
  `rule_version_id` + `explanation[]` → número `UPDATE series RETURNING` → snapshot +
  `sha256` + audit; PDF post-commit ADR-027); anulación sin liberar número +
  sustitución `replaces_id`; correlativo por quincena (IVA + ISLR, con anadidos marcados).
- **Aceptación:** 0 duplicados / 0 huecos en emisión concurrente (Inv. 5);
  comprobante emitido inmutable (Inv. 4); correlativo cuadra con comprobantes del período;
  ISLR **solo** tras cerrar G9 + matriz de conceptos (si no, R-E6 queda ⛔ y se documenta).
- **Módulos:** `withholdings`, `rules` (RDF gate), `reporting`, `periods`.

## R3 — Resumen de IVA (el que usa para declarar)

- **Alcance:** `getIvaSummary` por mes / por quincena (débitos, créditos, exentas,
  exportaciones, ajustes, excedente anterior, retenciones recibidas como línea sin neteo);
  conciliación libros↔resumen↔comprobantes; drill-down; versionado `report_versions`.
- **Aceptación:** resumen cuadra con libros ± tolerancia ADR-014; excedente Q1→Q2 trazado;
  retenciones recibidas concilian contra `withholdings_received`; caso mes piloto = Excel
  del contador (gate M5, diferencia 0 o justificada).
- **Módulos:** `reporting`, `received` (G3), `periods`.

## R4 — XML ISLR + TXT IVA (⚠️ gated por Q14, no prometer fecha)

- **Alcance:** generador + validador contra layout oficial SENIAT (esquema, campos,
  codificación, longitudes); XML mensual (agrega Q1+Q2 en especiales); TXT quincenal;
  descarga como handler con `sha256` y versión congelada igual que un reporte.
- **Aceptación:** archivo generado pasa el validador del layout; byte-a-byte contra
  ejemplo aceptado anonimizado (golden); rechazo claro si faltan datos (no "rellenar" en silencio).
- **Precondición dura:** respuesta Q14 = Sí + layouts + ejemplos + conceptos ISLR firmados.
  Si Q14 = No, R4 sale del v1 y se archiva como backlog v2.

## R5 — Cierre y paquete (lo que el cliente llamó "al cerrar cada periodo")

- **Alcance:** checklist de cierre bloqueante (filas pendientes, duplicados, NC sin afectado,
  retenciones sin conciliar) → `closePeriod` con `closure_hash` → paquete descargable del
  período (libros + resumen + comprobantes + correlativo + XML/TXT si aplican) →
  reapertura con motivo + nueva versión (hash anterior conservado).
- **Aceptación (mes real = Excel):** con M-1…M-4 del piloto, paquete mensual (ordinario)
  y Q1/Q2 + XML mensual (especial) reproducen los libros del contador; acta de aceptación
  firmada (M6). Sin esto no hay go-live.
- **Módulos:** `periods`, `reporting`, `audit`, runbooks F7.

## Riesgos y decisiones explícitas

1. **TXT/XML sin layout oficial** → no se construyen; pedir spec + ejemplo es R0, no R4.
2. **ISLR sin G9/matriz** → R-E6/R-E7 se documentan, no se codifican (regla de hierro
   G9: documentar, no codificar solución definitiva).
3. **Redondeo/FX sin ADR** → totales provisionales con tolerancia visible; F2 no cierra.
4. **"Resumen" ambiguo** → este roadmap lo desdobla siempre en *totales del libro* vs.
   *Resumen de IVA*; si el cliente usa otra acepción, se corrige en `01-...` §6, no en código.
