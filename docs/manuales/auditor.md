# Manual del auditor (solo lectura)

1. Traza cualquier total hasta su origen: documento → fila del CSV → archivo, con la justificación del cálculo visible.
2. Cada comprobante cita su `rule_version_id`; cada regla cita su decisión firmada (`sha256` en Decisiones).
3. Bitácora append-only con filtros por entidad/acción/fecha y exportable a CSV.
4. Verifica acta de cierre con `closure_hash` reproducible y reaperturas solo con motivo y responsable.
