# Guía — Rotación y purge de la clave `serverc` (2026-10-04)

> **Fuente operativa:** `docs/runbooks/incidente-serverc-2026-10-04.md` (ADR-029).
> Esta guía es el paso a paso ejecutable para cuando tengas acceso al servidor.
> **Regla de oro:** jamás pegues material privado en tickets, logs ni esta guía.
> Solo huellas (`ssh-keygen -lf`), hashes de commit y fechas.
> **Orden estricto:** Fase 1 (servidor) → Fase 2 (secretos) → Fase 3 (purge).
> Nunca purgues antes de rotar: si pierdes el único acceso, el purge no lo recupera.

## Fase 0 — Preparación (desde aquí, sin servidor)

1. Confirma el alcance en tu clon:
   ```bash
   git log --all --oneline -- serverc serverc.pub
   git branch -a --contains 7c70dbe
   git log origin/main --oneline -- serverc serverc.pub
   ```
2. Anota la huella de la clave vieja (solo huella, nunca el material):
   ```bash
   ssh-keygen -lf serverc.pub
   ssh-keygen -lf serverc
   ```
   Guarda: huella vieja, commit `7c70dbe`, ramas/tags que la contienen.
3. Lista los clones conocidos (devs, CI, VPS) para coordinar la Fase 3.
4. Verifica que tienes a mano: acceso al servidor por un medio que **no**
   dependa de esta clave (consola del proveedor, otra clave, etc.).

**Hecho cuando:** tienes huella vieja anotada, lista de clones y acceso
alternativo al servidor confirmado.

## Fase 1 — Rotar en el servidor (primero, hoy)

En tu máquina local (fuera de cualquier repo):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/erp_2026-10-04 -C "erp-2026-10-04"
ssh-keygen -lf ~/.ssh/erp_2026-10-04.pub
```

En el servidor, para **cada usuario** (incluido despliegue):

1. Busca la huella vieja en autorizados:
   ```bash
   grep -r "$(ssh-keygen -lf ~/.ssh/erp_vieja.pub | awk '{print $2}')" ~/.ssh/authorized_keys /home/*/.ssh/authorized_keys /root/.ssh/authorized_keys 2>/dev/null
   ```
   (Compara por huella, no por comentario.)
2. Agrega la pública **nueva** al final de cada `authorized_keys` donde estaba la vieja.
3. **En segunda sesión**, prueba el acceso con la clave nueva.
4. Solo con la nueva funcionando: elimina **todas** las líneas de la huella vieja.
5. Comprueba que la vieja es rechazada:
   ```bash
   ssh -i serverc usuario@host   # debe fallar
   ssh -i ~/.ssh/erp_2026-10-04 usuario@host   # debe entrar
   ```
6. Revisa el servidor desde la fecha de creación de la clave vieja:
   `auth.log`/`secure` con la huella vieja, usuarios nuevos, `crontab -l`,
   `/etc/cron*`, systemd timers, cambios en `authorized_keys`.
   **Indicio de uso ajeno ⇒ reconstruir el servidor** y rotar todo secreto
   que él contenga (Fase 2).

**Hecho cuando:** la huella vieja no autentica en ningún host y la revisión
de registros queda firmada en la tabla de Registro.

## Fase 2 — Rotar resto de secretos (SEC-03)

La privada convivió con el workspace: asumir exposición colateral.
Procedimiento base en `docs/runbooks/rotacion-secretos.md`. Mínimo:

- `DATABASE_URL` (owner) + `APP_DATABASE_URL` (`app_runtime`)
- `AUTH_SECRET`, `FILE_SIGNING_SECRET`, `UPLOADTHING_TOKEN`
- Contraseñas de seed/admin

**Hecho cuando:** cada secreto rotado con fecha y responsable; sesiones
existentes invalidadas (re-login esperado); `health` + login OK.

## Fase 3 — Purgar historial + remoto (coordinado)

> Requiere `git filter-repo` (o BFG). Avisa a todo clon: deberán re-clonar
> tras el force-push. Si el repo es/era público o hay forks fuera de control,
> la rotación (Fases 1–2) es la única mitigación real.

```bash
# 0. Respaldo cifrado del estado actual (sin secretos) fuera de la máquina
# 1. Clon espejo fresco
git clone --mirror git@github.com:noemdb/erp.git erp-mirror.git
cd erp-mirror.git
# 2. Eliminar los blobs en TODO el historial
git filter-repo --invert-paths --path serverc --path serverc.pub --force
# 3. Verificar: debe quedar vacío
git log --all --oneline -- serverc serverc.pub   # (sin salida)
git rev-list --all | xargs -r git grep -l "BEGIN OPENSSH PRIVATE KEY" -- || true
# 4. Reescribir remoto (coordinado con todo el equipo)
git push --force --all
git push --force --tags
```

Post-purge en cada clon:

```bash
git fetch origin
git checkout main
git reset --hard origin/main
# ramas locales con la clave: rebasear sobre el nuevo main o re-clonar
```

**Hecho cuando:** `git log --all -- serverc` vacío en origin y en clones;
`npm run secrets:scan` en verde; hook pre-commit desbloqueado.

## Fase 4 — Limpieza del workspace

Solo después de Fases 1–2 (los archivos hacen falta para huella y evidencia):

```bash
git rm --cached serverc serverc.pub   # si aún trackeados tras el purge
rm serverc serverc.pub
git ls-files | grep serverc || echo "limpio"
```

`.gitignore` ya cubre `serverc*` (línea 30): verifica que siga ahí.

## Registro (sin secretos)

| Fecha | Fase | Huella / commit | Resultado | Responsable |
|---|---|---|---|---|
| pendiente | F0 preparación | huella vieja: … | alcance + clones listados | |
| pendiente | F1 rotación servidor | huella vieja: … | vieja rechazada / registros revisados | |
| pendiente | F2 rotación secretos | — | sesiones invalidadas, health+login OK | |
| pendiente | F3 purge + force-push | `7c70dbe` purgado | `git log -- serverc` vacío en origin | |
| pendiente | F4 limpieza workspace | — | `git ls-files \| grep serverc` vacío | |

## Referencias

- `docs/runbooks/incidente-serverc-2026-10-04.md` (runbook operativo)
- `docs/runbooks/rotacion-secretos.md` (procedimiento base de secretos)
- ADR-029 en `docs/DECISIONS.md`
