# Runbook — Backup

1. Neon: PITR activado + retención verificada en consola; `pg_dump` diario programado fuera del servidor:
   `pg_dump "$DATABASE_MIGRATION_URL" -Fc -f /externo/erp-$(date +%F).dump`
2. Cifra la copia en reposo y verifica tamaño > 0 + prueba de listado (`pg_restore --list`).
3. Un backup sin restore drill no es evidencia: sigue `runbooks/restore.md` y registra RPO/RTO.

## Desde la app (solo admin)
`Configuración → Descargar backup .sql`: genera el mismo dump en formato plano, listo para restaurar con `psql -f` o desde `Configuración → Restaurar`. Límite 5/hora; cada descarga queda en el log del servidor.
