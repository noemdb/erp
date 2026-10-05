# T12 — SEC-03 rotación secretos + revisión servidor 🔲

- **Ref:** runbook `incidente-serverc-2026-10-04.md` §1+§3 (filas aún pendientes en tabla §6).
- **Hacer:** clave vieja rechazada en todo host + `auth.log`/usuarios/cron revisados; rotar `DATABASE_URL` owner + `app_runtime`, `AUTH_SECRET`, `FILE_SIGNING_SECRET`, token almacenamiento, seeds; re-login y health+login OK.
- **Aceptación:** tabla §6 del runbook firmada por fila. Si indicio de uso ajeno ⇒ reconstruir servidor.
