# Runbook — Fallo de importación

1. Abre el lote: si está en `failed` o con rechazadas, descarga `rechazadas.csv` (incluye errores por fila).
2. Causas típicas: columnas faltantes (revisa alias/mapeo), decimales con formato inesperado, RIF inválido, duplicados intra-archivo o contra BD, descuadre base+IVA.
3. Corrige el CSV y súbelo de nuevo (el `sha256` evita duplicar si re-subes el mismo).
4. Si el formato del legacy cambió, documenta el nuevo mapeo; perfiles persistentes solo si el formato se repite.
5. Nunca edites `import_rows` a mano: re-valida desde la UI para regenerar contadores.
