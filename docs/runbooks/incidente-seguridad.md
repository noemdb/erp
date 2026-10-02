# Runbook — Incidente de seguridad

1. Contener: revoca sesiones (`DELETE FROM sessions WHERE user_id=...`), desactiva usuario/membresía, rota `AUTH_SECRET`/`FILE_SIGNING_SECRET` y claves DB si hubo exposición.
2. Preservar: no borres bitácora (`audit_events` es append-only); exporta CSV del rango afectado.
3. Investigar: `audit_events` por actor/entidad/fecha; revisa `company_user` y accesos cross-empresa.
4. Recuperar: verifica `/api/health`, emite reporte de integridad (resumen + conciliación + reproducibilidad).
5. Registrar: fecha, alcance, causa, acciones, responsables. Avisar al cliente según criticidad.
