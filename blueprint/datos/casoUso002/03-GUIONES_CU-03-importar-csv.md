# CU-03 — Importación CSV (staging + autodetect)

**Actor:** Administrativo  
**Precondición:** `import:autodetect` operativo (verificado 05-oct).  
**Postcondición:** compras importadas a staging, revisadas y confirmadas en TX.

## Pasos

1. Ir a **Importar → Nueva**.
2. Subir `compras-oct-2026.csv`.
3. Sistema ejecuta `import:autodetect`:
   - Detecta layout "compras-legacy" (80 % válido según intake).
   - Muestra preview de filas mapeadas.
4. Revisar staging:
   - Verificar 3 filas, sin duplicados (`sha256` único).
   - Verificar mapeo de columnas (base_imponible, alicuota_iva, etc.).
5. Confirmar importación (TX).
6. Verificar que las 3 compras quedan registradas con `source_files.sha256`.
7. Re-subir el mismo archivo: debe rechazar por duplicado (`sha256`).

## Criterios de aceptación

- [ ] Autodetect reconoce layout (o marca para revisión manual).
- [ ] Staging muestra 3 filas válidas, 0 errores.
- [ ] Confirmación en TX: o todas o ninguna.
- [ ] `source_files` guarda bytes + sha256.
- [ ] Re-subida del mismo archivo no duplica.
- [ ] Divergencia importada vs recalculada: se marca (si aplica).

## Desviaciones observadas

| # | Descripción | Severidad | Acción |
|---|-------------|-----------|--------|
| | | | |