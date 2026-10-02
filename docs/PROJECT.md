# PROJECT.md — ERP-TributarioLite

> **Estado:** v0.1 propuesta · **Actualizado:** 2026-09-30 · **Dueño:** equipo + contador cliente · **Fuentes:** `blueprint/ROADMAP`, cuestionario PDF Noe Dominguez, `DOMAIN.md`
> Ver también: `README.md`, `ARCHITECTURE.md`, `DOMAIN.md`, `TODO.md` (F0–F7).

## Elevator Pitch

Sistema web multiempresa que registra compras, ventas, pagos y retenciones una sola vez y deriva libros de IVA, resumen y comprobantes IVA/ISLR en PDF/Excel, para empresas venezolanas que hoy operan en Excel + software legacy + máquina fiscal.

## Problema

- **¿Quién lo sufre?** Administrativos, contadores y auditores de 1–N empresas (grupo o escritorio contable), 100–200 docs/mes.
- **¿Cómo hoy?** Transcripción manual en 5 plantillas Excel, CSV del legacy y Z de máquina fiscal, fórmulas frágiles (`#REF!` visto).
- **¿Por qué no alcanza?** Duplicación libros↔comprobantes↔resumen, errores base/IVA/retenido, sin trazabilidad (quién/cuándo/fila CSV), numeración sin control, NC/ND y cierres frágiles.

## Usuarios objetivo

| Rol | Necesidad principal | Nivel técnico |
|---|---|---|
| Administrativo | Importar CSV, registrar/corregir, preparar | Medio-bajo |
| Contador | Validar, configurar reglas, emitir, cerrar | Medio-alto fiscal |
| Auditor | Trazar total→documento→CSV, leer bitácora | Medio |
| Admin sistema | Usuarios/empresas/permisos | Alto |

Proveedor sin login v1 (solo tercero registrado).

## Propuesta de valor

Fuente única de verdad fiscal: hecho → motor puro versionado (`rule_version_id` + `explanation[]`) → comprobante inmutable numerado sin huecos → libro/resumen reproducible + cierre congelado con `closure_hash`.

## Alcance v1 (dentro)

Empresas/sucursales opcionales, terceros+RIF dual, compras/ventas/NC/ND/Z/pagos mínimos/pagos parciales, retenciones recibidas (registro), importación CSV con staging, retenciones IVA/ISLR multi-factura, libros + resumen + conciliación + drill-down, cierre/reapertura controlada, auditoría append-only, PDF/Excel.

## Fuera de v1 (explícito)

Factura electrónica, portal proveedores, correo, API tiempo real legacy/Z/SENIAT, contabilidad completa (diario/mayor/balance), nómina, inventario, OCR/IA. Diseño reservado (`source_type`, rol `supplier`, cola pg-boss) sin construir.

## Métricas de éxito (M1–M6)

M1 esqueleto vertical, M2 mes real = Excel, M3 0 huecos concurrencia, M4 cierre reproducible, M5 paralelo Excel vs sistema =0, M6 firma contador. 100% dorados verdes, 0 fugas tenant, restore probado, respuesta “¿de dónde salió?” ≤3 clics.

## Contexto / restricciones

Venezuela: normativa cambiante (providencias 2025, Decreto 1.808), IVA mensual/quincenal por empresa (G1), conectividad/eléctrico irregular → deploy simple sin Docker (Neon + procesos directos) + backup externo cifrado + restore drill. Sin dependencia realtime externa v1. Reglas solo válidas con matriz firmada contador.

## Referencias

`blueprint/cuestionarioClient.md`, `blueprint/ERP Tributario (mini) Perplexity.md`, `blueprint/fuentes ERP Tributario Lite.md`, `blueprint/ROADMAP-ERP-TributarioLite.md` §1–§2, cuestionario PDF (10 secciones), plantilla XLSX recibida y pendiente de validación como golden master.
