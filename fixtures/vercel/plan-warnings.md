# Plan — Resolver warnings build Vercel (log 2026-10-02 iad1)

Deploy ref: `noemdb/erp@7c70dbe`, Next 16.3.8 --webpack, 674 pkgs, build 2m OK.
Alcance: solo warnings, sin cambio funcional. Bloqueados: no tocar G4/FX, G8, G9-ISLR.

## 1. Diagnóstico (qué sale en el log)

| # | Warning | Origen probable | Riesgo |
|---|---------|-----------------|--------|
| W1 | `rimraf@2.7.1, inflight@1.0.6, glob@7.2.3, fstream@1.0.12` | transitivas de `exceljs@4.4.0` (+ ` Rimraf/glob` viejos) | bajo build, CVEs conocidas en glob/fstream |
| W2 | `lodash.isequal@4.5.0` | transitiva (prob. `exceljs` / `apexcharts`) → usar `node:util.isDeepStrictEqual` | bajo |
| W3 | `@esbuild-kit/esm-loader, core-utils` | `tsx@4` viejo arrastra esbuild-kit deprecado | medio (tooling) |
| W4 | `uuid@8.3.2` | transitiva (prob. `uploadthing` / `drizzle-kit` / `exceljs`) | bajo, EOL 2028 |
| W5 | `eslint@9.39.5 deprecated` | `eslint-config-next@16` pide otra versión / pin viejo | medio (lint en CI) |
| W6 | `6 install-scripts no cubiertos: esbuild x4 (0.18/0.19/0.21/0.28), msgpackr-extract@3, unrs-resolver@1.12` | nuevo modelo allowScripts npm+Vercel | alto si se bloquean postinstall nativos |

## 2. Plan por pasos

### Paso 0 — Baseline reproducible
```bash
npm ls rimraf glob inflight fstream lodash.isequal uuid @esbuild-kit/esm-loader esbuild msgpackr-extract unrs-resolver
npm outdated
npm install-scripts ls
```
Guardar salida en `fixtures/vercel/baseline-<fecha>.txt`. Criterio: árbol conocido antes de tocar.

### Paso 1 — W6 allowScripts (primero, desbloquea resto)
1. `npm install-scripts ls` → revisar lista.
2. Aprobar solo los 6: `npm install-scripts approve esbuild@0.18.20 esbuild@0.19.12 esbuild@0.21.5 esbuild@0.28.2 msgpackr-extract@3.0.4 unrs-resolver@1.12.2`
3. Verificar que `package.json` registra `installScripts`/`trustedDependencies` y commitear.
4. Redeploy preview sin caché, confirmar que desaparece el bloque W6.
Riesgo: aprobar de más = superficie supply-chain. Solo esos 6.

### Paso 2 — W3 esbuild-kit (tsx)
1. `npm ls @esbuild-kit/esm-loader` → confirmar que viene de `tsx@4.23.15`.
2. Subir `tsx` a última v4 (`npm i -D tsx@latest`), que ya mergeó a `tsx.hirok.io` y elimina esbuild-kit.
3. `npm run typecheck && npm run goldens:check && npm test` (dorados deben seguir 100%).
4. Si rompe scripts `tsx src/...`, fijar versión exacta en `package.json`.

### Paso 3 — W1+W2 transitivas exceljs
1. `npm ls rimraf glob fstream lodash.isequal` → confirmar raíz `exceljs@4.4.0` (abandonado 2020).
2. Opción A (recomendada, bajo riesgo): dejar — documentar como aceptado, dependabot solo patch. No hay reemplazo drop-in sin reescribir import Excel.
3. Opción B (si SECURITY lo exige por glob/fstream): migrar `exceljs` → `exceljs2-fork` o `xlsx` solo en módulo import, con golden Excel-vs-golden antes/después. Crear bloque en `docs/TODO.md` + ADR, es cambio mayor — fuera de este plan.
Decisión por defecto: A.

### Paso 4 — W4 uuid@8
1. `npm ls uuid` → si es transitiva, `npm dedupe` / `npm update <padre>`; no pinnear directo.
2. Solo si `package.json` propio lo usa: migrar a `uuid@11` (CJS) o `uuid@latest` (ESM).
3. Verificar `npm run build` local.

### Paso 5 — W5 eslint
1. `npm ls eslint` → alinear `eslint@^9` con lo que pide `eslint-config-next@16`.
2. `npm i -D eslint@<versión-soportada> eslint-config-next@latest`, luego `npm run lint`.
3. Si Next 16 aún no soporta la última, pinnear la recomendada en https://eslint.org/version-support y documentar.

### Paso 6 — Verificación final
```bash
rm -rf .next node_modules && npm ci && npm run build
npm run lint && npm run typecheck && npm test
```
Deploy a preview **sin caché** → log debe mostrar 0 `npm warn deprecated` de la lista + 0 `install-scripts`. Luego deploy con caché para confirmar tiempo <2m y `Build cache uploaded` OK.

## 3. Orden sugerido / esfuerzo

1. W6 (30min) → 2. W3 (1h) → 3. W5 (1h) → 4. W4 (30min) → 5. W1/W2 aceptar (0, solo doc).
Total ~3h, en PRs separados por paso para revertir fácil.

## 4. Criterios de aceptación

- [ ] Log Vercel sin W6 y sin W3.
- [ ] W1/W2/W4: o eliminados o registrados como aceptados con `npm ls` evidencia.
- [ ] `lint + typecheck + vitest + goldens` verdes.
- [ ] Sin cambio en rutas (47 rutas, 3 estáticas) ni en `docs/API.md`.
- [ ] Actualizar `docs/CHANGELOG.md` + `docs/TODO.md` al cerrar (AGENTS.md §3).
