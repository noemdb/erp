# Runbook — Fallo de emisión

1. Si la emisión falla, el número **no se consume** (rollback transaccional): reintenta con los mismos documentos.
2. `DUPLICATE_DOCUMENT` en certificado: no reintentes a ciegas; verifica en la bandeja si el comprobante ya existe.
3. `NOT_APPLICABLE` / validación: revisa agente, sujeto, regla vigente y período (preview muestra el motivo).
4. Doble clic: la segunda emisión sobre los mismos documentos se rechaza (lock + chequeo); confirma en bandeja antes de reemitir.
5. Si el error persiste, conserva el `batchId`/ids, exporta bitácora del rango y escala con el mensaje exacto (`code`).
