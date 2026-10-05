# ENMIENDA v1.1 al ROADMAP-MAESTRO-TERCERA_REV (2026-10-04)

> Corrige la propuesta v1.0 del 2026-10-02 sin reescribir su historia.
> Base normativa: ADR-029 + `docs/runbooks/incidente-serverc-2026-10-04.md`.
> La v1.0 sigue legible como diagnóstico de su fecha; lo que sigue la
> actualiza donde la verificación del 2026-10-04 la desmintió.

## E-1. H-1/H-2 quedan reemplazados (bloqueante)

La v1.0 §1.2 decía: clave "sin trackeo", trabajo "sin commitear".
Verificado 2026-10-04:

- `git ls-files` lista `serverc` + `serverc.pub` (trackeados).
- `git log --all -- serverc` → `7c70dbe wip 2026-10-02_10:10:34`.
- `git log origin/main -- serverc` confirma presencia en remoto
  (`git@github.com:noemdb/erp.git`).
- `git check-ignore`: `.gitignore` **no** cubre `serverc*` (solo `.env`).
- `git status`: árbol limpio → el trabajo de la sesión sí se commiteó
  (wips hasta `ce38b76` 2026-10-04) y `main` está al día con `origin/main`.

Por tanto SEC-01/SEC-02 de la v1.0 son insuficientes. El alcance real es:

1. **SEC-01′ (hoy, primero):** rotar en el servidor (par nuevo fuera del
   repo → instalar → probar en 2ª sesión → revocar huella vieja →
   revisar `auth.log`, usuarios, cron, `authorized_keys`; indicio de uso
   ajeno ⇒ reconstruir servidor). La clave se asume comprometida.
2. **SEC-03′ (parte del incidente):** rotar resto de secretos (DB
   owner/`app_runtime`, `AUTH_SECRET`, `FILE_SIGNING_SECRET`, token
   almacenamiento, seeds) — base `rotacion-secretos.md`.
3. **SEC-04 (nuevo):** purgar historial (`git filter-repo --path serverc
   --path serverc.pub`) + force-push coordinado de ramas/tags; verificar
   `git log --all -- serverc` vacío en origin; re-clonar clones.
   Si el repo es/era público o hay forks fuera de control, solo la
   rotación mitiga de verdad.
4. **SEC-02′:** `.gitignore` + escáner pre-commit/CI + escaneo de
   workspace e historial; borrar `serverc*` del workspace **después** de
   preservar huellas. GIT-01 solo con orden explícita + escáner limpio.
5. **H0 no se cierra** sin purge verificado + escáner activo. Sin eso no
   entra dato real al sistema.

Ejecución: `docs/runbooks/incidente-serverc-2026-10-04.md`. Evidencia:
huellas, hashes de commit, fechas — jamás el material privado.

## E-2. Contrato del motor: cerrado, no bloqueador

La v1.0 §11 #2 y F0-03 piden "contrato de unidades" como decisión pendiente.
`files/scenario-candidate.schema.ts:2-7` registra contrato ya confirmado por
el dueño: **porcentajes como fracción string (`0.03` = 3 %), base ISLR
`base_gravable` (IVA conserva `base_imponible`), montos string 2 decimales,
fechas ISO, `round2` HALF_UP provisional hasta G8**.

Decisión E-2: el contrato de unidades/base **está cerrado**. F0-03 queda en
"alinear el normalizador con los tipos reales del motor si difieren los
nombres de campo", no en re-debatir fracción vs puntos. ISLR-09 ya aplica la
corrección (base 900 → retención 306.00); F0-03 la **verifica**, no la
"corrige".

## E-3. GIT-02: aclaración de alcance

La guardia del seeder (`origin=synthetic`, negar en prod, exigir
`--matrix-hash` para valores reales, no activable en prod) puede requerir
columna/migración nueva si `origin` no existe en el schema. Añadir
**+0.25–0.5 día** para verificar schema o confirmar que es metadato, antes
de estimar GIT-02 como 0.5–1d cerrado.

## E-4. Fechas: F0-01 vencido, S1/S2 al límite

- F0-01 figuraba "vie 2-oct / lun 5-oct". Hoy 04-oct (domingo): el hito del
  02-oct **venció**. Límite duro re-fijado: **lun 05-oct** (paquete +
  muestras + 18 preguntas + 5 de formato + piloto/tiempos).
- S1 (SEC-01…03 + TST + GIT-02 + DOC + F0-01 ≈ 5.35–8.85d en 5 días) y S2
  (DOC-05 + FUN-06 + REP-02 + ACC-01/02 + F0-02/03 + OPS-03/04) están al
  límite con k=1; con k=2 (hipótesis agentes solo para cat. A) apenas caben.
  Planificar spillover explícito S1→S2 y recalibrar k observado al cierre
  de H0 (principio 8 de la v1.0, riesgo R-11).

## E-5. Qué cambia en la lectura del cronograma

Nada del cómputo 62 ítems / 118–201 días-persona cambia salvo:

- +SEC-04 (purge coordinado): **0.5–1 día** cat. A en H0.
- +E-3 (verificación schema `origin`): **0.25–0.5 día** en H0.
- Subtotal H0 pasa de 5.35–8.85 a **≈ 6.1–10.35 días-persona**.
- F0-03 se acorta (contrato cerrado): solo alineación de tipos.

Criterio de salida H0 enmendado: clave vieja rechazada en todo host +
registros revisados + secretos rotados + **purge verificado en origin** +
escáner activo + 73/73 + F0-01 enviado el 05-oct.

## E-6. Aplicación mínima sobre la v1.0 (sin reescribirla)

1. Cabecera: añadir "Enmendada por ENMIENDA-v1.1-2026-10-04 + ADR-029".
2. §1.2 H-1/H-2: anotar "reemplazados por E-1 (clave en historial+remoto)".
3. §6.1/§6.2: remitir a `docs/runbooks/incidente-serverc-2026-10-04.md`.
4. H0: añadir SEC-04 + nota E-3; F0-03 con alcance E-2; F0-01 límite 05-oct.
