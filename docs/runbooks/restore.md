# Runbook — Restore de base de datos

> RPO ≤ 24h (ideal ≤ 1h). Probar periódicamente y anotar fecha abajo.

## Neon (actual)
1. Consola Neon → Backups / PITR → elegir punto → restore a rama o principal.
2. Verificar: `npm run typecheck`, abrir `/api/health` (db ok), revisar último `closure_hash` y `generated_reports`.
3. Registrar drill: fecha, responsable, RPO medido, observaciones.

## Reconciliación de numeración post-restore (2.0.5 §5.3)
1. Antes de reabrir la emisión: `npx tsx scripts/reconcile-series.ts <companyId>` (solo lectura).
2. Si hay `GAP_DB` (el ledger externo conoce emisiones perdidas por el restore): resembrar la serie al máximo del ledger con SQL documentado en el informe del drill y **no emitir** hasta que el reconcile salga OK.
3. Si hay `GAP_LEDGER`: revisar la escritura del ledger (fallo best-effort), no resembrar a la baja.

## pg_dump manual (si aplica)
```bash
pg_dump "$DATABASE_MIGRATION_URL" -Fc -f backup-$(date +%F).dump
# restore
pg_restore -d "$DATABASE_MIGRATION_URL" backup-FECHA.dump
```

## Drill log
| Fecha | Responsable | Resultado |
|---|---|---|
| pendiente | | |
