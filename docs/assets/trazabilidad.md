# Trazabilidad total → documento → CSV

> Versión no técnica de `ARCHITECTURE.md` flujo + `DOMAIN.md` Inv.7.

```
Total libro/resumen
 └→ documento (purchase/sales_documents + fiscal_period_id + fecha_fiscal)
     └→ líneas + regla (rule_version_id + snapshot + explanation[])
         └→ comprobante (series + certificate_number + sha256, issued inmutable)
             └→ origen (source_file_id + row_number + import_batch_id + archivo original)
                 └→ auditoría (audit_events: quién/cuándo/before/after/motivo)
```

PNG: exportar mermaid de ARCHITECTURE/DATABASE aquí para contador (`componentes.png`, `erd.png`). Golden `.xlsx` pendiente.
