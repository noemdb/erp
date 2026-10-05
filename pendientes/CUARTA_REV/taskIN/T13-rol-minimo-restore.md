# T13 — Rol mínimo + restore drill 🔲

- **Hacer:** `DB_LEAST_PRIVILEGE=true` en staging (dev sigue owner hasta migrar seeds de pruebas a `withTenant`); restore drill real con RPO/RTO medidos y registrados.
- **Aceptación:** suite verde con rol mínimo fuera de dev + RPO/RTO en runbook restore.
