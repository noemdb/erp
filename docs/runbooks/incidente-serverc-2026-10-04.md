# Runbook — Incidente `serverc` (clave SSH en historial + remoto)

> **Fecha:** 2026-10-04 · **Severidad:** crítica · **ADR:** ADR-029
> **Hallazgo:** `serverc` (privada, 444B) + `serverc.pub` están trackeados,
> commiteados en `7c70dbe` y presentes en `origin/main`
> (`git@github.com:noemdb/erp.git`). `.gitignore` no los cubre.
> El ROADMAP-MAESTRO v1.0 §1.2 H-1/H-2 decía "sin trackeo / sin commitear":
> quedó desactualizado el 2026-10-02. Este runbook lo reemplaza operativamente
> (el roadmap se corrige por enmienda, no por edición del pasado).

## 0. Principios

1. **La clave se asume comprometida.** No basta borrar archivos del workspace.
2. **Rotar acceso antes de purgar historia:** si se pierde el único acceso al
   servidor, el purge no lo recupera.
3. **Sin secretos en evidencia:** registrar huellas (`ssh-keygen -lf`),
   fechas y resultados — jamás el material privado.
4. **Coordinar el force-push:** avisa a todo clon antes de reescribir `main`.

## 1. Contener — rotar en el servidor (hoy, primero)

1. Identificar qué host(s)/usuario(s) autoriza la clave:
   `ssh-keygen -lf serverc.pub` (huella) y buscarla en cada
   `~/.ssh/authorized_keys` (todos los usuarios, incluidos despliegue).
2. Generar par nuevo **fuera del repo** (p. ej. `~/.ssh/erp_2026-10-04`,
   ed25519, con frase de contraseña).
3. Instalar la pública nueva en el servidor → probar acceso en **segunda
   sesión** → quitar **todas** las líneas de la huella vieja →
   comprobar que la vieja es rechazada (`ssh -i serverc user@host` debe fallar).
4. Revisar el servidor: `auth.log`/`secure` con la huella vieja desde su
   fecha de creación; usuarios nuevos, cron (`crontab -l`, `/etc/cron*`,
   systemd timers), cambios en `authorized_keys`.
   **Indicio de uso ajeno ⇒ escalar a reconstrucción del servidor**
   y rotar todo secreto que él contenga (ver §3).
5. Si el servidor guarda env de producción, rotar según §3.

**Hecho cuando:** la huella vieja no autentica en ningún host; revisión de
registros firmada en la tabla §6.

## 2. Preservar evidencia (antes del purge)

1. Anotar: huella vieja (`ssh-keygen -lf`), commit que la introdujo
   (`git log --all --oneline -- serverc serverc.pub` → `7c70dbe`),
   ramas/tags que la contienen (`git branch -a --contains 7c70dbe`),
   fecha de creación del archivo y del commit.
2. Exportar lista de clones conocidos (devs, CI, VPS) para coordinar §4.
3. No subir la clave a ningún ticket/log. Solo huellas y hashes de commit.

## 3. Rotar resto de secretos (SEC-03, parte del incidente)

Porque la clave privada convivió con el workspace (agentes, copias, posible
sincronización), asumir exposición colateral:

- `DATABASE_URL` owner + `APP_DATABASE_URL` (`app_runtime`), `AUTH_SECRET`,
  `FILE_SIGNING_SECRET`, `UPLOADTHING_TOKEN`, contraseñas de seed/admin.
- Procedimiento base en `rotacion-secretos.md`; registrar aquí fecha y
  responsable por secreto (tabla §6). Sesiones existentes quedan inválidas
  (re-login esperado).

## 4. Purgar historial + remoto (coordinado)

> Requiere `git filter-repo` (o BFG). Avisar antes: todo clon deberá
> re-clonar tras el force-push.

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
# si hay ramas locales con la clave, rebasearlas sobre el nuevo main o re-clonar
```

Si el repo es/era público, o hubo mirrors/forks fuera de control,
**la rotación §1+§3 es la única mitigación real** (el historial copiado
no se puede recoger).

## 5. Higiene para que no se repita (SEC-02)

1. `.gitignore` (repo): `serverc*`, `*.pem`, `*.key`, `id_*`,
   `.env*` (excepto `.env.example`), volcados y carpetas de datos reales.
2. Escáner de secretos en pre-commit + CI (falla ante secreto nuevo) +
   escaneo de workspace e historial tras el purge.
3. Eliminar los archivos del workspace **solo después** de §1–§2
   (hacen falta huella y `git log` para la evidencia).
4. Rebanadas de commit (GIT-01) **solo con orden explícita del dueño**
   y con escáner limpio.

## 6. Registro (sin secretos)

| Fecha | Acción | Huella / commit | Resultado | Responsable |
|---|---|---|---|---|
| pendiente | Rotación servidor (§1) | huella vieja: … | vieja rechazada / registros revisados | |
| pendiente | Rotación secretos (§3) | — | sesiones invalidadas, health+login OK | |
| pendiente | Purge historial + force-push (§4) | `7c70dbe` purgado | `git log -- serverc` vacío en origin | |
| pendiente | `.gitignore` + escáner (§5) | — | CI falla ante secreto nuevo | |
| pendiente | Borrado workspace `serverc*` | — | `git ls-files \| grep serverc` vacío | |

## 7. Referencias

- `docs/runbooks/rotacion-secretos.md` (procedimiento base de secretos)
- `docs/runbooks/incidente-seguridad.md` (contención genérica)
- ADR-029 (decisión de purge + rotación; este runbook es su ejecución)
- `pendientes/TERCERA_REV/ENMIENDA-v1.1-2026-10-04.md` (corrección del roadmap)
