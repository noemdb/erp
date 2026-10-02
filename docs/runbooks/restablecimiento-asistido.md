# Runbook — Restablecimiento asistido + break-glass

## Asistido (normal)
1. Admin abre `/usuarios`, genera el enlace para el correo y lo entrega por canal externo (presencial/llamada). El enlace se muestra una sola vez.
2. El usuario abre el enlace, fija contraseña (≥10) y reingresa; sus sesiones previas quedan invalidadas.
3. Todo queda en bitácora (`reset_issue`). TTL 60 min (`RECOVERY_TTL_MIN`).

## Break-glass (último admin bloqueado)
1. Con acceso al servidor: fija `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` en `.env` + `npm run seed:admin` (crea o reutiliza el usuario y le da admin en la empresa demo).
2. Entrar, rotar la contraseña por el flujo normal y registrar el uso del procedimiento en bitácora/manual.
3. Nunca dejes el password inicial en `.env` después de usarlo.
