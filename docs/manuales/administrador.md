# Manual del administrador del sistema

1. Usuarios: créalos y asígnales empresa + rol (`company_user`). Sin membresía no ven nada. Para revocar, desactiva la membresía o el usuario.
2. Revisa sesiones activas en base (`sessions`) ante incidentes; pide al usuario salir o elimina su sesión.
3. Salud: `/api/health` debe dar `ok` (db + storage). Si degrada, revisa logs (sin PII) y Neon.
4. Secretos: rota según `runbooks/rotacion-secretos.md` antes de producción y cada incidente.
5. Contingencia: restore (`runbooks/restore.md`), reapertura (`runbooks/reapertura.md`), incidente (`runbooks/incidente-seguridad.md`).
