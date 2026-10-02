# Runbook — Rotación de secretos

> El `.env` del workspace llegó con valores reales: rotar antes de producción.

1. Generar nuevos: `AUTH_SECRET` y `FILE_SIGNING_SECRET` (≥32 chars aleatorios), claves Neon (consola → reset), tokens Uploadthing.
2. Actualizar `.env` (nunca commitear; ver `.env.example`). Reiniciar app + worker.
3. Sesiones: las existentes con `AUTH_SECRET` anterior quedan inválidas → usuarios reingresan (esperado).
4. Verificar `/api/health` y login. Registrar fecha abajo.

| Fecha | Qué rotó | Responsable |
|---|---|---|
| pendiente | inicial (pre-prod) | |
