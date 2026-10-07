# 01 — Spec de validación y firma de dorados

> **Estado:** propuesta (sin ADR, sin migración, sin código) · **Fecha:** 2026-10-07
> **Dueño:** equipo + contador · **Hermano:** `blueprint/rdf/` (ADR-034)
> **Regla de oro:** sin firma verificable no hay dorado; sin dorado firmado no hay go-live.

---

## 1. El problema, dicho sin adornos

El gate de go-live exige **30 dorados firmados** (`_manifest.umbralGolive=30`). Hoy hay **0**, y
la causa no es que falten 30 pruebas: es que **no existe un mecanismo para que el contador firme**.

Lo que hay hoy,_textualmente, es esto (`fixtures/tax-scenarios/README.md`):

> 1. Resuélvelo a mano y escribe el JSON con `estado: "VALIDADO_CONTADOR"` y `firma: { firmado_por, fecha, fuente_legal }` (sin `sha256_contenido` aún).
> 2. Corre `npm run goldens:check`: fallará con `FIRMA <id>: sha256_contenido no coincide (esperado <hash>)`.
> 3. Copia ese `<hash>` a `firma.sha256_contenido` y repite.
> 4. El hash cubre todo el contenido menos el bloque `firma`.

Es decir: **el contador no firma nada**. Escribe su nombre en un archivo, corre una herramienta,
copia un texto que la herramienta le devuelve, y a partir de ahí el archivo dice que está firmado.
Eso prueba que el archivo no cambió desde que alguien calculó un hash. No prueba quién lo hizo.

### 1.1 Lo que sí funciona y hay que reutilizar

El módulo `rdf` (ADR-034, migración 0023) resolvió, para las **decisiones fiscales**, exactamente
este mismo problema:

| Necesidad | Cómo lo resolvió `rdf` |
|---|---|
| Identidad del firmante | `firmadoPor` FK a `users` + `firmanteNombre`/`firmanteDoc` |
| Rol del firmante | `authorize()`: solo `contador` firma |
| Separación de funciones | Cuatro-ojos: si firmó quien redactó y hay otro contador, exige `motivo` |
| Integridad | `signedContentHash()` sobre canónico |
| Inmutabilidad | Trigger `rdf_immutable` |
| Auditoría | `record(tx, …, 'sign', …)` en la misma TX |
| Evidencia | `evidenciaAdjuntoId` → `attachments` |
| Estados | `draft → in_review → approved → signed → applied`, con `returned`/`rejected`/`superseded` |
| UI | `/c/[id]/decisiones` con flujo por rol |

**El 90 % de este spec es reutilizar ese módulo.** La decisión de diseño más importante del
documento es esa, y por eso conviene decirla temprano: *no se propone un segundo sistema de firma,
se propone que los dorados entren al que ya existe.*

---

## 2. Objetivos

| ID | Objetivo | Cómo se mide |
|---|---|---|
| O1 | Que solo un usuario autenticado con rol `contador` pueda firmar | Test: auditor/adminfirmar ⇒ `FORBIDDEN` |
| O2 | Que la firma quede atada a una identidad real, no a texto libre | `firmado_por` es FK a `users`, NOT NULL |
| O3 | Que un dorado firmado no se pueda modificar | Test: UPDATE contenido en `SIGNED` ⇒ excepción de trigger |
| O4 | Que toda firma quede auditada en la misma TX | Test: transacción abortada ⇒ 0 filas en `audit_events` |
| O5 | Que el archivo firmado se pueda verificar **sin el sistema** | `goldens:verify` corre en CI con solo clave pública |
| O6 | Que no se pueda firmar un dorado que el motor no reproduce | Firmar ⇒ ejecutar el motor ⇒ si difiere, `GOLDEN_NOT_REPRODUCED` |
| O7 | Que el contador pueda firmar sin tocar el repositorio | Todo el flujo por UI; el archivo es salida |
| O8 | Que el gate ACC-03 y `acceptance:gate` lean el mismo conteo desde el mismo origen | Ambos leen `golden_cases` con `estado='SIGNED'` |

## 3. No objetivos

| No | Por qué |
|---|---|
| **No** cambiar el umbral de 30 | Es decisión de negocio ya tomada |
| **No** tocar `tax-engine` | Este spec es de integridad, no de cálculo |
| **No** rediseñar la UI de `/decisiones` | Se agrega una pestaña, no un producto nuevo |
| **No** decidir la validez legal de la firma | §7 lo escala al contador |
| **No** regenerar los 17 candidatos | Se normalizan y se borran sus inconsistencias; redactar nuevos es otra tarea |
| **No** hacer que el sistema "adivine" el esperado | El esperado lo escribe el contador o se deriva de una sim; nunca se calcula con la misma función que se prueba |

---

## 4. Hallazgos verificados que motivation el spec

Todos reproducidos el 07-oct-2026 contra el repo.

### 🔴 D1 — La firma no tiene identidad: es falsificable

`verifyFirma` comprueba únicamente que `firma.sha256_contenido` sea igual al hash del contenido. El
hash cubre **el contenido**, nunca **al firmante**. Reproducido:

```js
// cualquiera con permiso de escritura en fixtures/
const s = { id:"IVA-99", estado:"VALIDADO_CONTADOR",
            firma:{ firmado_por:"Contador Juan Pérez", fecha:"2099-01-01", fuente_legal:"inventada" },
            esperado:{ x:"1.00" } };
const { firma, ...resto } = s;
s.firma.sha256_contenido = createHash("sha256").update(canonical(resto)).digest("hex");
// → verifyFirma(s)  =  { firmado: true }
// → isFirmado(s)    =  true
```

Tres líneas de Node y el gate de activación lo acepta. La fecha `2099-01-01` también pasa: no hay
validación de fecha.

### 🔴 D2 — `firmado_por` es texto libre

No hay FK, no hay verificación de rol, no hay registro de quién escribió el archivo. El campo
existe en `schema.json` con `minLength: 3`.

### 🔴 D3 — `goldens:check` pasa con dorados sin firma

Reproducido: un fixture sin `estado` (o con `estado: "CANDIDATO"`) produce **0 errores** y la
salida dice `goldens ok (N fixtures, 0 firmados)` con **exit 0**. El chequeo de "candidato sin
firma" es un `JSON.stringify(s).includes("PROPUESTO_NO_VALIDADO")`, que solo caza una cadena
concreta. El resultado: CI verde con dorados sin firmar dentro de `fixtures/`.

La causa de fondo: `estado` **no está en `required`** de `schema.json`, y `esperado` está en
`required` pero **sin `type` ni `properties`**, así que cualquier valor lo satisface.

### 🟡 D4 — No hay inmutabilidad: el gate reacciona, no previene

RDF tiene trigger `rdf_immutable`. Los dorados no tienen nada. Nada impide editar un dorado
firmado; el gate simplemente_DIRÍA que ya no verifica. Detectar es distinto de impedir.

### 🟡 D5 — No hay auditoría, ni RBAC, ni cuatro-ojos, ni evidencia

`audit_events` no registra firmas de dorados. Nada comprueba que el firmante sea `contador`. No hay
separación de funciones. No hay `evidencia_adjunto_id`. El RDF tiene las cuatro cosas.

### 🟡 D6 — Dos consumidores del mismo fixture, reglas distintas

| Consumidor | Caso "el IVA no aplica" |
|---|---|
| `activation-gate.ts:51,113` | Soportado: `ivaEsperado.noAplica === true` ⇒ `pass: true` |
| `engine.test.ts:26` | **Roto**: `expect(iva.applicable).toBe(true)` incondicional |
| `schema.json` | **Prohíbe** `noAplica`: exige `retainedAmount` en `ivaEsperado` |

El gate soporta un campo que el schema prohíbe y que el test rompe. Un dorado correcto y firmado
para IVA-03 ("contribuyente formal, no se retiene") daría **rojo falso**.

### 🔴 D7 — 5 de los 17 candidatos no son ejecutables

`pendientes/TERCERA_REV/files/dorados-candidatos-normalizados-F0.json` ya trae el campo
`ejecutable`. Resultado verificado:

| ID | `ejecutable` | Motivo |
|---|---|---|
| ISLR-07 | `false` | `PENDIENTE_CRITERIO`: dos criterios válidos (1.285,00 vs 1.392,50) |
| ISLR-09 | `false` | `FUERA_DE_ALCANCE_V1` |
| ABONO-01 | `false` | `PENDIENTE_CRITERIO` (G2) |
| ABONO-02 | `false` | `PENDIENTE_CRITERIO` (G2) |
| ABONO-03 | `false` | `PENDIENTE_CRITERIO` (G2) |

El runner (`engine.test.ts`) solo ejecuta bloques `doc`, `iva` e `islr`. **No hay corredor de
eventos de liquidación**, así que los casos ABONO no se pueden verificar aunque se firmen.
`ISLR-09` además ya no aplica en v1.

### 🔴 D8 — 2 de los 12 ejecutables proban reglas que el motor no implementa

`computeIvaWithholding` (`src/modules/tax-engine/compute.ts:55-69`) decide con tres condiciones:
empresa agente, tercero sujeto, regla vigente, IVA > 0. **No existe** el umbral de 20 UT ni la
lista de exclusiones del art. 3.

| Candidato | Qué prueba | Estado del motor |
|---|---|---|
| IVA-03 | Proveedor contribuyente formal ⇒ no se retiene | `matriz-reglas-v1.md`: *"Pendiente de desglosar en reglas y fixtures"*. El motor solo conoce `TERCERO_NO_SUJETO`, no la exención |
| IVA-04 | Caja chica ≤ 20 UT (860,00) ⇒ no se retiene | El motor **no tiene** el umbral. Sin código no hay forma de expresarlo |

Firmar estos dos hoy produce dorados que o bien no reproducen, o bien "pasan" porque se marcaron
`TERCERO_NO_SUJETO` sin haber probado el umbral.

### 🟢 D9 — Tres canónicos duplicados

`canonical()` en `validate-goldens.mjs`, `gateCanonical()` en `activation-gate.ts`,
`rdfCanonical()` en `rdf/canonical.ts`. Tres copias de la misma idea. Un hash firmado con uno puede
no coincidir al verificar con otro si divergen. Refactor a `modules/shared/` (§2 de `02`).

### 🟢 D10 — El hash cubre `estado`

`verifyFirma` hashea `{...s}` sin `firma`, lo que **incluye `estado`**. Consecuencia: si mañana se
añade un estado nuevo, todos los dorados firmados dejan de verificar. El hash debería cubrir
solo el contenido inmutable, no los metadatos de estado. Mencionado en `02` §3.4.

---

## 5. Usuarios y permisos

| Actor | Qué hace | Permiso nuevo |
|---|---|---|
| **Contador** | Redacta, envía a revisión, firma, retira | `goldens.sign` (firma), `goldens.write` (redacta) |
| **Admin** | Configura claves de firma, restaura, ejecuta | `goldens.admin` |
| **Auditor** | Lee y verifica; no firma | `goldens.read` |
| **Administrativo** | Nada | — |
| **CI / `goldens:verify`** | Verifica firmas offline con clave pública | — |

Cuatro-ojos (misma regla que `rdf/service.ts:179-187`): si el firmante es el mismo que creó el caso
**y hay otro contador en la empresa**, el bypass exige `motivo` y queda marcado
`four_eyes_bypass: true` en la firma y en la auditoría. Si no hay segundo contador, pasa sin
motivo y sin marca. Ese "si no hay segundo contador, pasa" es una decisión de negocio que ya se
tomó para el RDF; este spec la hereda y la deja sujeta a la matriz de roles que sigue pendiente
(`docs/anexos/roles-piloto-form.md`, ADR-020).

---

## 6. Flujo

### 6.1 Preparar (contador o equipo)

```text
redactar CANDIDATO ──► ejecutar contra motor ──► si difiere: se devuelve con el diff
        │                                              (no se puede firmar un diff)
        ▼ si reproduce
   enviar IN_REVIEW ──► contador APRUEBA ──► Approved
                                              │
                                              ▼
                              CONTADOR FIRMA  ──► content_sha256 + firma + identity
                                              │
                                              ▼
                                          SIGNED   (inmutable desde aquí)
```

`UPDATE`: mientras siga en `CANDIDATO`/`RETURNED`, libre y auditado.
`IN_REVIEW` y `APPROVED` son de solo lectura: si el contador quiere cambiar algo, devuelve con
motivo y vuelve a `CANDIDATO`. Es la razón por la que el hash de la firma no se invalida por
ediciones posteriores.

### 6.2 Firmar — la acción que este spec hace real

```
firmGoldenCase(caseId, { firmanteNombre, firmanteDoc, evidenciaAdjuntoId, motivo? })
  1. authorize(ctx, "goldens.sign")                      → sin rol contador: FORBIDDEN
  2. con TX:
     3.   leer el caso; exigir estado APPROVED           → si no: INVALID_STATE_TRANSITION
     4.   si created_by == ctx.userId y hay otro contador → exigir motivo (cuatro-ojos)
     5.   contentSha256 = contentHash(contenido)         ← canónico único
     6.   EJECUTAR el motor contra el contenido          ← si no reproduce: GOLDEN_NOT_REPRODUCED
     7.   insertar en golden_signatures (firmado_por = ctx.userId)
     8.   update golden_cases → SIGNED
     9.   audit.record(tx, …, 'sign', …)                ← misma TX
    10. commit
```

El paso 6 es el que convierte la firma en algo con valor: **no se firma lo que el sistema no
reproduce**. Hoy se puede firmar cualquier JSON; con este paso, el sistema se compromete a que su
propio motor da ese número.

### 6.3 Distribuir y verificar

```text
npm run goldens:export          → escribe fixtures/tax-scenarios/ desde la DB (determinista)
npm run goldens:export --check  → falla si hay deriva entre DB y disco
npm run goldens:verify          → verifica cada archivo con la clave pública (offline, en CI)
npm run goldens:check           → el validador actual, migrado al canónico único
```

`goldens:verify` es la pieza que cierra O5: corre sin base de datos, sin servidor y sin secretos.
Un auditor con un repositorio puede comprobar que las firmas son genuinas.

---

## 7. La decisión que no es técnica

**¿Qué necesita el contador para firmar: una llave propia, o le basta la sesión del sistema?**

Esto no lo decide el equipo. El mecanismo técnico está diseñado para las dos, pero la elección
depende del valor legal que se le quiera dar a la firma y de la obligación de cada contador.

### Opción 1 — Firma autenticada por el sistema (sin llave del contador)

El contador entra al sistema con su usuario, revisa el número, pulsa Firmar. El sistema registra
`firmado_por` (usuario real), fecha, contenido y hash; `algoritmo = hmac-sha256` con clave de
servicio por empresa.

- A favor: fricción cero. El contador no tiene que generar ni custodiar nada.
- En contra: la clave la tiene el sistema, así que quien administra el sistema puede firmar.
- El valor probatorio es "el sistema registró que el usuario X aprobó este número".

### Opción 2 — El contador firma con llave propia (Ed25519)

El contador genera su par de llaves en su dispositivo, registra la pública en
`golden_signing_keys`, y firma localmente. El sistema verifica y guarda la firma.

- A favor: no delegable. Ni el administrador del sistema puede firmar por el contador.
- En contra: hay que resolver custodia, respaldo, pérdida y renovación de la llave.
- El valor probatorio es "el titular de esta llave aprobó este número", verificable sin el sistema.

### Opción 3 — Firma por token de un proveedor externo

Como Opción 1, pero el sistema no genera la firma: se delega en un proveedor de firma
(corporativo del contador, o un serviciotimestamps/qualified).

- A favor: valor legal más fuerte sin gestión de llaves propia.
- En contra: costo, dependencia externa, y un proveedor que hay que elegir y auditar.

### Recomendación del equipo

**Opción 1 para v1, con la Opción 2 preparada en el modelo de datos.** Razón: el contador tiene que
firmar 30 casos y probablemente más; cualquier fricción de llaves convierte la meta de 06-nov en
imposible. El esquema ya soporta las tres (`algoritmo` con CHECK, `key_id`, tabla de claves), así
que endurecer después no requiere migración.

**Esto no se decide aquí.** Es la pregunta que hay que llevarle al contador junto con la matriz v1,
y su respuesta debería quedar por escrito (ADR-035) antes de escribir la primera línea de código.

---

## 8. Estados

| Estado | Quién lo pone | Qué habilita | Sale a |
|---|---|---|---|
| `CANDIDATO` | equipo o contador | Ejecución y ajuste | `IN_REVIEW`, `REJECTED`, `NOT_EXECUTABLE` |
| `REJECTED` | contador | Nada; queda como registro de por qué no | `CANDIDATO` (nueva versión) |
| `NOT_EXECUTABLE` | contador | El caso se documenta pero no cuenta para el umbral | `CANDIDATO` |
| `RETURNED` | contador | Corregir y reenviar | `CANDIDATO` |
| `IN_REVIEW` | autor | Espera aprobación | `APPROVED`, `RETURNED`, `REJECTED` |
| `APPROVED` | contador | Listo para firmar | `SIGNED`, `RETURNED`, `REJECTED` |
| `SIGNED` | contador | **Cuenta para el umbral de go-live** | `SUPERSEDED`, `RETIRED` |
| `SUPERSEDED` | sistema | Reemplazado por versión nueva | — |
| `RETIRED` | contador | Fuera de uso, sigue en la historia | — |

`SIGNED` es terminal en el sentido de que no se edita: solo se reemplaza o se retira, y ambos
dejan rastro. La inmutabilidad la garantiza el trigger, no la aplicación.

---

## 9. Reglas de negocio

| ID | Regla |
|---|---|
| **RG-01** | Solo rol `contador` firma. Sin excepción por admin. |
| **RG-02** | Firmado es inmutable. Corregir = versión nueva con `supersedes_id`. |
| **RG-03** | No se firma lo que el motor no reproduce. El diff se devuelve al redactor. |
| **RG-04** | El hash cubre el contenido, no el estado (corrige D10). |
| **RG-05** | `firmado_por` es siempre un `users` real. Nunca texto libre. |
| **RG-06** | Quien firma lo que redactó, con otro contador disponible, deja `motivo` y marca el bypass. |
| **RG-07** | El archivo en disco es salida generada. Editarlo a mano rompe el CI. |
| **RG-08** | Todo dorado `SIGNED` va con evidencia: norma, artículo o acta (adjunto). |
| **RG-09** | El conteo del umbral sale de la DB, no de contar archivos. |
| **RG-10** | Un dorado `sintetico` no cuenta para `go-live`; cuenta para CI. Mismo criterio que el gate ACC-03. |
| **RG-11** | Todo dorado firmado debe quedar trazado a un RDF (`decision_id`) cuando la regla lo requiera; es la unión de ADR-034 con este spec. |

**Sobre RG-10:** es una decisión que conviene confirmar. Hoy `IVA-01` es el único fixture y es
`sintetico` con `firmado_por: "didáctico-sin-firma"`. Si los 30 dorados de go-live tienen que ser
`real` o `real_anonimizado`, hace falta que el contador aporte el mes real (T10) antes de poder
firmar 30. Es coherente con `roadmapRev5`, que pone T10 antes de T11, pero conviene que sea
explícito desde ahora y no descubrirlo en noviembre.

---

## 10. Impacto en lo que ya existe

| Archivo | Cambio | Riesgo |
|---|---|---|
| `fixtures/tax-scenarios/schema.json` | `estado` pasa a `required`; `esperado` con `type`; admitir `ivaEsperado.noAplica` (alinearse con el gate) | Rompe el fixture actual si no se actualiza en el mismo commit |
| `fixtures/tax-scenarios/README.md` | Sustituir el ritual del hash por el flujo por UI | Ninguno |
| `scripts/validate-goldens.mjs` | Usar el canónico único; contar desde la DB; fallar con candidatos sin firma | Bajo, es un script |
| `src/modules/tax-engine/engine.test.ts` | Corregir `expect(iva.applicable).toBe(true)` (D6) | Bajo, pero **bloquea dorados de no-aplica** |
| `src/modules/rules/activation-gate.ts` | Dejar de leer disco; leer `golden_cases` | Medio: es el gate que bloquea la activación |
| `src/modules/rdf/canonical.ts` | Se mueve a `modules/shared/` (D9) | Bajo, si se hace con los tres consumidores a la vez |
| `scripts/acceptance-gate.mjs` | `dorados firmados` pasa a contar desde DB | Bajo |
| `package.json` | `goldens:export`, `goldens:verify` | Ninguno |
| `docs/DECISIONS.md` | ADR-035 (mecanismo de firma) + respuesta a §7 | — |
| `docs/DATABASE.md`, `API.md`, `DOMAIN.md`, `SECURITY.md` | Documentar tablas, acciones, invariante I-GD-1, RBAC | — |
| `docs/TODO.md` | Bloque F0 "dorados 30-50" pasa a tener mecanismo | — |

---

## 11. Lo que este spec no resuelve

1. **El corredor de eventos de liquidación** (D7): sin él, los 3 casos ABONO no son dorados.
   Es trabajo de `tax-engine`/reporting y pertenece a T07.
2. **El umbral de 20 UT y las exclusiones del art. 3** (D8): son reglas fiscales que hay que
   modelar, no un mecanismo de firma. Dependen de la matriz v1.
3. **Los 18 casos que hay que redactar de nuevo** (`04-tests-rollout.md §2`): los 17 candidatos dan
   12 ejecutables.
4. **La validez legal** (§7): la responde el contador.
5. **La matriz de roles** que decide si el bypass de cuatro-ojos es aceptable con un solo contador
   por empresa: ADR-020, pendiente desde octubre.