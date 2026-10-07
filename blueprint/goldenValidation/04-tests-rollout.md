# 04 — Tests, gates, plan por fases y riesgos

> **Estado:** propuesta · **Fecha:** 2026-10-07
> **Referencia de formato:** `blueprint/rdf/04-tests-rollout.md`

---

## 1. Tests exigidos

Ningún bloque se cierra sin su checklist de `docs/TODO.md`: funciona, errores y casos límite,
tests, dominio, API documentada y SECURITY revisado.

### 1.1 Servicio (Neon dev, no mocks)

| ID | Test | Espera |
|---|---|---|
| `svc-01` | Contador firma un caso `APPROVED` que reproduce | `ok`, `contentSha256` devuelto |
| `svc-02` | El motor **no** reproduce el esperado | `GOLDEN_NOT_REPRODUCED` con el diff, sin firma |
| `svc-03` | Auditor intenta firmar | `FORBIDDEN` |
| `svc-04` | Admin intenta firmar | `FORBIDDEN` |
| `svc-05` | Administrativo intenta firmar | `FORBIDDEN` |
| `svc-06` | Firmar un caso `CANDIDATO` (saltarse revisión) | `INVALID_STATE_TRANSITION` |
| `svc-07` | Firmar dos veces el mismo caso | `GOLDEN_ALREADY_SIGNED` |
| `svc-08` | Quien redactó firma con otro contador disponible, sin motivo | `GOLDEN_FOUR_EYES` |
| `svc-09` | El mismo, con motivo | ok, `four_eyes_bypass: true`, motivo en auditoría |
| `svc-10` | Empresa con un solo contador | Firma sin motivo, **sin** marca de bypass |
| `svc-11` | UPDATE de `contenido` con estado `SIGNED` | Excepción `GOLDEN_SIGNED_INMUTABLE` |
| `svc-12` | DELETE con estado `SIGNED` | Excepción |
| `svc-13` | `SIGNED → CANDIDATO` | Excepción `GOLDEN_SIGNED_NO_REGRESAR` |
| `svc-14` | Transición de estado inválida | `INVALID_STATE_TRANSITION` |
| `svc-15` | Abortar la TX de firma | 0 filas en `golden_signatures` **y** 0 en `audit_events` |
| `svc-16` | Firma sin evidencia cuando la regla exige norma | Validación, sin firma |
| `svc-17` | Correr 10 firmas concurrentes del mismo caso | 1 gana, 9 reciben `GOLDEN_ALREADY_SIGNED`, 0 duplicados |

### 1.2 Fuga multitenant (obligatorio en CI)

| ID | Test |
|---|---|
| `ten-01` | Contador de A no lee casos de B |
| `ten-02` | Contador de A no firma casos de B |
| `ten-03` | El hash de un caso de A no verifica contra la clave de B |
| `ten-04` | RLS de `golden_signatures` bloquea el acceso directo sin `withTenant` |

### 1.3 Puros (sin DB)

| ID | Test |
|---|---|
| `pur-01` | `contentHash` es estable: mismo contenido, mismo hash, 100 corridas |
| `pur-02` | Cambiar una tecla del contenido cambia el hash |
| `pur-03` | El hash no cambia al reordenar las claves del objeto |
| `pur-04` | El hash **no** incluye el bloque de firma (corrige D10) |
| `pur-05` | `FraccionSchema` rechaza `"16"` y acepta `"0.16"` |
| `pur-06` | `MoneySchema` rechaza `1000` (número) y acepta `"1000.00"` |
| `pur-07` | Verificar firma Ed25519 con la clave pública, sin DB |
| `pur-08` | Verificar firma con la clave equivocada ⇒ falla |
| `pur-09` | `contentHash` del canónico único === `gateCanonical` === `canonical` del script (D9) |

### 1.4 Integración y E2E

| ID | Test | Recorrido |
|---|---|---|
| `e2e-01` | Firmar un dorado de punta a punta por UI | Login contador → dorados → crear → ejecutar → enviar → aprobar → firmar → ver hash |
| `e2e-02` | El PDF de evidencia sale con el hash correcto | Firma → descarga → hash del PDF === hash del diálogo |
| `e2e-03` | Un caso que no reproduce no deja firmarse | Redactar esperado incorrecto → ejecutar → ver diff → dialog de firma bloqueado con el motivo |
| `e2e-04` | Cobertura muestra la regla sin dorados | Regla nueva sin cobertura → `/dorados/cobertura` la señala |

---

## 2. La aritmética de los 30 dorados

Este es el punto que conviene que el contador vea **antes** de firmar la matriz v1, porque cambia
la planificación de T05.

### 2.1 De dónde sale cada número

| Grupo | Candidatos | Ejecutables | Firmables hoy | Notas |
|---|---|---|---|---|
| ISLR | 7 (01-06, 08) | 6 | 6 | 07 requiere criterio G2/RDF |
| IVA | 5 | 5 | **3** | 03 y 04 proban reglas no implementadas (D8) |
| ABONO | 3 | 0 | **0** | Sin corredor de eventos (D7) |
| **Total candidatos** | **17** | **12** | **9** | |
| ISLR-09 | (contado arriba) | `false` | 0 | `FUERA_DE_ALCANCE_V1` |

Los dos que salen de los 12 por D8 (IVA-03, IVA-04) **no son problema de firma**: son problema
de modelo. Se pueden firmar como `NOT_EXECUTABLE` para documentar la regla, pero no cuentan para
el umbral.

### 2.2 Lo que hay que redactar de cero

```text
Meta de go-live                                  30 dorados firmados
Menos los candidatos firmables                   − 9
                                                 ────
Hay que redactar y hacer firmables               21 casos nuevos
```

Y si se quiere que los 30 sean de origen real (RG-10), los 21 salen del mes real del contador
(T10), que es exactamente lo que `roadmapRev5 §6` ya tenía previsto pero sin esta cifra.

**Distribución sugerida de los 21 nuevos:**

| Regla | Casos | Nota |
|---|---|---|
| IVA 75 % línea | 4 | Multilínea, distintos cortes de alícuota |
| IVA 100 % | 3 | Incluye el caso con IVA no discriminado |
| IVA exclusiones | 4 | Los supuestos del art. 3, uno por caso, **cuando existan** |
| ISLR conceptos | 6 | Un concepto por caso, según los que la empresa pague de verdad |
| ISLR personas jurídicas | 2 | Con y sin mínimo |
| Eventos de liquidación | 2 | Parcial y anticipo |

---

## 3. Gates

| Gate | Condición | Perfil |
|---|---|---|
| **G-Firma** | Todo dorado `SIGNED` verifica contra clave pública; `signedBy` es `users`; sin casos sin firma en el directorio | `ci` |
| **G-Reproducción** | 100 % de los dorados firmados reproducen contra el motor | `ci` |
| **G-Cobertura** | Toda regla no sintética con eldorados firmados que la cubran | `release` |
| **G-Exportación** | `goldens:export --check` sin deriva entre DB y disco | `ci` |
| **G-Umbral** | `dorados firmados >= 30` y `matrizVersion` con hash | `golive` |
| **G-Evidencia** | Los dorados de `golive` son `real` o `real_anonimizado` | `golive` |

Integración con lo existente:

```text
goldens:verify  ──► G-Firma
engine.test.ts  ──► G-Reproducción
activation-gate ──► G-Cobertura   (cambia de leer disco a leer DB)
goldens:export --check ──► G-Exportación
acceptance:gate --profile=golive ──► G-Umbral + G-Evidencia
```

---

## 4. Plan por fases

### Fase 0 — Sin migración, sin ADR (se puede empezar ya)

| Bloque | Contenido | Dependencia |
|---|---|---|
| 0.1 | Corregir `engine.test.ts` para que soporte `noAplica` (D6) | Ninguna |
| 0.2 | Canónico único en `modules/shared/`, los 3 consumidores migran (D9) | Ninguna |
| 0.3 | `schema.json`: `estado` a `required`, `esperado` con `type`, admitir `noAplica` (D3, D6) | 0.2 |
| 0.4 | `FraccionSchema` en el borde de captura y en el redactor (escala de alícuota) | 0.3 |
| 0.5 | `goldens:verify` como script puro, sin DB (O5) | 0.2 |

Estas cinco no dependen del contador ni de la respuesta a §7. **Cierran los defectos D3, D6 y D9
y dejan el terreno nivelado.**

### Fase 1 — Decisión

| Bloque | Contenido | Dependencia |
|---|---|---|
| 1.1 | Llevar §7 del spec 01 al contador: Opción 1, 2 o 3 | — |
| 1.2 | **ADR-035** mecanismo de firma digital de dorados | 1.1 |
| 1.3 | **ADR-036** respuesta a §7 + RG-10 (origen sintético vs real en go-live) | 1.1 |
| 1.4 | Confirmar el número 21 de §2.2 con el contador | 1.1 |

**Sin 1.1 y 1.2 no hay migración.** Es el mismo régimen que G4/G8/G9: no se toca el motor ni el
modelo de datos por decisión del equipo.

### Fase 2 — Modelo de datos

| Bloque | Contenido |
|---|---|
| 2.1 | Migración `0024`: 3 tablas + índices + uniques |
| 2.2 | Migración `0025`: RLS + policies |
| 2.3 | Migración `0026`: `golden_signed_immutable` + trigger |
| 2.4 | Migración `0027`: `GRANT` para `app_runtime` |
| 2.5 | Verificación en Neon dev: trigger probado con UPDATE y DELETE reales |
| 2.6 | `scripts/create-app-role.mjs` re-ejecutado (los `default privileges` no cubren tablas nuevas) |

### Fase 3 — Servicio y export

| Bloque | Contenido |
|---|---|
| 3.1 | `modules/goldens/`: schemas, repo, service, actions, labels |
| 3.2 | `signGoldenCase` con RG-01…RG-06 y el paso de ejecución (RG-03) |
| 3.3 | `exportGoldens` determinista + `--check` de deriva |
| 3.4 | Reordenar `activation-gate.ts` a DB, conservando `GATE_NO_COVERAGE`/`GATE_FAILED` |
| 3.5 | `acceptance-gate.mjs` cuenta desde DB |
| 3.6 | Tests de servicio, de fuga y puros verdes |

### Fase 4 — UI

| Bloque | Contenido |
|---|---|
| 4.1 | Bandeja con cobertura por regla |
| 4.2 | Ficha con las 4 pestañas |
| 4.3 | Dialog de firma con hash visible antes de firmar |
| 4.4 | Cobertura: qué regla falta dorado |
| 4.5 | Handle CSV y certificado PDF de firma |
| 4.6 | Playwright `e2e-01`…`e2e-04` |

### Fase 5 — Migración de lo que ya existe

| Bloque | Contenido |
|---|---|
| 5.1 | `IVA-01-compra-gravada.json` entra a `CANDIDATO` (hoy tiene `firmado_por: "didáctico-sin-firma"`, que es exactamente el defecto que este spec cierra) |
| 5.2 | Los 12 ejecutables de `TERCERA_REV/files/` se normalizan al schema y se propose |
| 5.3 | `IVA-03` e `IVA-04` a `NOT_EXECUTABLE` con el motivo |
| 5.4 | Los 4 `PENDIENTE_CRITERIO` quedan en `CANDIDATO` con nota que enlaza al RDF correspondiente |

---

## 5. Rollout

| Entorno | Qué está activo |
|---|---|
| **dev** | Migraciones 0024-0027, módulo completo, UI completa, firma con `algoritmo` de prueba |
| **CI** | Migraciones sobre Neon de pruebas, `goldens:verify`, `G-Firma`, `G-Reproducción`, `G-Exportación` |
| **staging** | Todo lo anterior **más** el guardián de producción: sin `--matrix-hash` firmado no se puede firmar |
| **prod** | Solo después de T05 y T11. Antes, el guardián de `acceptance:gate --profile=golive` |

**Criterio de noqueo:** el mecanismo completo entra en `staging` antes de que el contador firme su
primer dorado real. Descubrir un problema de la UI con el contador esperando es la forma más
cara de perder la sesión del 23-oct.

---

## 6. Riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | La respuesta a §7 tarda y bloquea la migración | Alta | Alto | Fase 0 no depende de ella; llevar la pregunta con la matriz v1 |
| R2 | El contador firma 9 casos y descubre que el umbral real era 21 más | Media | Medio | Decirlo en §2.2 **antes** de la sesión, no en noviembre |
| R3 | Los 30 dorados exigen origen real y el mes real llega tarde (T10) | Media | Alto | RG-10 explícito; si se relaja a sintético, dejarlo escrito en ADR-036 |
| R4 | Firma con llave propia (Opción 2) y el contador pierde la llave | Baja | Alto | Retirada de clave no invalida firmas;|Emisión de nueva clave y re-firma solo de lo no firmado |
| R5 | La migración rompe el gate de activación en producción | Baja | Alto | Mismo orden de la migración 0023; `GATE_NO_COVERAGE` se mantiene idéntico durante el despliegue |
| R6 | El motor y el dorado se desarrollan juntos (se ajusta el motor para que pase) | Baja | **Muy alto** | El dorado se congela firmado; el motor se cambia por decisión; si cambia el esperado, se firma versión nueva |
| R7 | Un caso "no aplica" se confunde con "retuvo 0,00" | Media | Medio | `esperado` discriminado (RG en §4.1 de `03`), `motivo` de lista cerrada |
| R8 | El canónico único cambia algún hash firmado existente | Baja | Medio | Los 0 dorados firmados hacen la migración gratis ahora; por eso hay que hacerlo en Fase 0 |
| R9 | La UI de firma se usa para salir de un caso problemático ("MODIFICAR" como atajo) | Media | Medio | `RETURNED` con motivo en vez de editar en revisión; auditoría de ambos caminos |

**R6 es el riesgo que importa.** La tentación natural, cuando un dorado firmado falla, es tocar el
motor hasta que pase. Eso convertiría la suite de dorados en una tautología: el sistema siempre
"pasa" porque se ajustó a sí mismo. El proceso correcto es el inverso: si el motor está mal, se
corrige el motor **con su propio dorado**, y el dorado firmado sigue siendo la referencia.

---

## 7. Definición de terminado

```text
[ ] Un contador puede firmar un dorado por la UI, sin tocar el repositorio
[ ] La firma queda con identidad de users, rol verificado, hash y evidencia
[ ] Un dorado firmado no se puede modificar ni borrar (trigger probado en Neon dev)
[ ] goldens:verify valida los archivos sin base de datos ni servidor
[ ] goldens:export --check falla si alguien edita un archivo a mano
[ ] activation-gate y acceptance:gate leen el mismo conteo desde la DB
[ ] Cero defectos D1-D5 abiertos
[ ] ADR-035 y ADR-036 aceptadas, con la respuesta a §7 escrita
[ ] El contador sabe que hacen falta 21 casos nuevos, no 13
[ ] Un recorrido completo probado con firmante antes de la sesión (Q-09 del QUINTA_REV)
```