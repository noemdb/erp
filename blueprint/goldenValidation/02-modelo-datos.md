# 02 — Modelo de datos, criptografía e inmutabilidad

> **Estado:** propuesta · **Fecha:** 2026-10-07
> **Precedente:** `fiscal_decisions` (ADR-034, migración 0023) y el trigger `rdf_immutable`.

---

## 1. Decisión de forma: dónde vive la firma

Hoy el dorado es **un archivo del repositorio** y la firma vive **dentro del archivo**. Eso obliga
a que la firma sea verificable sin sistema, y por eso el hash terminó siendo la única defensa.

Este spec propone **invertir la responsabilidad**:

```text
   La verdad           → base de datos (golden_cases + golden_signatures)
   La distribución     → fixtures/tax-scenarios/*.json  (generado, nunca editado a mano)
   La verificación     → doble: en CI (offline, con clave pública) y en la app (contra DB)
```

Consecuencias:

| Aspecto | Hoy | Con el spec |
|---|---|---|
| Quién firma | cualquiera con escritura de archivo | usuario autenticado con rol `contador` |
| Identidad | texto libre | FK a `users` + rol verificado en la TX |
| Inmutabilidad | ninguna | trigger de base de datos |
| Auditoría | ninguna | `audit_events` en la misma TX |
| Exportación | manual | `npm run goldens:export` (determinista) |
| Editar a mano | permitido | CI falla por deriva |

**El archivo sigue siendo verificable sin base de datos** (objetivo O5) porque lleva su propia
firma y la clave pública de referencia. La base de datos es la fuente de verdad, no el archivo.

---

## 2. Canonización: un solo canonico en todo el proyecto

Hoy existen **tres** canónicos casi idénticos y ninguno compartido:

| Ubicación | Función | Nota |
|---|---|---|
| `scripts/validate-goldens.mjs` | `canonical(v)` | JS puro, no exportado a TS |
| `src/modules/rules/activation-gate.ts` | `gateCanonical(v)` | espejo del anterior |
| `src/modules/rdf/canonical.ts` | `rdfCanonical(v)` + `rdfHash` | el más completo, con `signedContentHash` |

Tres copias de la misma idea es exactamente la clase de deuda que produce el defecto D9 (el gate
acepta `noAplica` y el runner no). **Este spec propone un solo módulo:**

```text
src/modules/shared/canonical.ts
  ├── canonical(v: unknown): string              // claves ordenadas recursivamente
  ├── contentHash(v: unknown): string            // sha256 hex
  └── type SignedEnvelope<T> = { contenido: T; firma: FirmaDigital }
```

`activation-gate.ts`, `validate-goldens.mjs` y `rdf/canonical.ts` pasan a importarlo. Es un refactor
pequeño, sin cambio de comportamiento, y es **precondición** de este spec: si los tres canónicos
siguen distintos, un hash calculado para firmar puede no coincidir al verificar.

**Regla de formato (DR-01):** `JSON.stringify` con claves ordenadas, números solo como texto
decimal, sin espacios, sin `undefined`, sin NaN. Un dorado con `1000.00` y otro con `1000.0` tienen
hash distinto; por eso todo monto del schema es `string` con 2 decimales y todo porcentaje es
`string` con 1 a 6 decimales. Esto ya está en `schema.json`; este spec solo lo declara normativo.

---

## 3. Esquema

### 3.1 `golden_cases`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | text | NOT NULL | `IVA-01`, `ISLR-07`, `ABONO-01`. Unique por empresa |
| `company_id` | uuid | FK companies NOT NULL | Dueño del caso (RLS) |
| `tipo` | text | NOT NULL CHECK IN ('iva','islr','evento_retencion') | Clase de regla que cubre |
| `descripcion` | text | NOT NULL minLength 10 | Texto libre para el contador |
| `origen` | text | NOT NULL CHECK IN ('real','real_anonimizado','sintetico') | Procedencia del caso |
| `contenido` | jsonb | NOT NULL | El cuerpo del escenario: entradas, esperado, fórmula |
| `estado` | text | NOT NULL DEFAULT 'CANDIDATO' CHECK IN ('CANDIDATO','REJECTED','NOT_EXECUTABLE','RETURNED','IN_REVIEW','APPROVED','SIGNED','SUPERSEDED','RETIRED') | Máquina de estados |
| `version` | integer | NOT NULL DEFAULT 1 | Sube con cada `supersede` |
| `supersedes_id` | uuid | FK golden_cases NULL | Dorado que este reemplaza |
| `decision_id` | uuid | FK fiscal_decisions NULL | RDF que autoriza la regla (ADR-034) |
| `motivo` | text | NULL | Motivo de `RETURNED`/`REJECTED`/`RETIRED` |
| `ejecutado_en` | timestamptz | NULL | Última corrida contra el motor |
| `ultimo_diff` | text | NULL | Diff de la última ejecución fallida |
| `created_by` | uuid | FK users NOT NULL | Quién lo redactó (base del cuatro-ojos) |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

Índices: `UNIQUE(company_id, id)`, `INDEX(company_id, estado)`, `INDEX(company_id, tipo)`.

### 3.2 `golden_signatures`

Una fila por firma. La separación permite firmar varias veces a lo largo de la vida del caso
(v2, v3) sin perder la historia, en vez de sobrescribir.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | |
| `company_id` | uuid | FK companies NOT NULL | Redundante para RLS |
| `case_id` | uuid | FK golden_cases RESTRICT NOT NULL | Caso firmado |
| `case_version` | integer | NOT NULL | Versión del caso en el momento de firmar |
| `content_sha256` | text | NOT NULL CHECK 64 hex | Hash del contenido canónico |
| `firma` | text | NOT NULL | Firma digital en base64 (ver §4) |
| `algoritmo` | text | NOT NULL CHECK IN ('ed25519','hmac-sha256') | Ver §4 |
| `key_id` | text | NOT NULL | Clave que firma |
| `firmado_por` | uuid | FK users NOT NULL | Identidad del contador (no texto libre) |
| `firmado_en` | timestamptz | NOT NULL | Fecha y hora de la firma |
| `four_eyes_bypass` | boolean | NOT NULL DEFAULT false | Firmó quien redactó y había otro contador |
| `motivo_bypass` | text | NULL | Obligatorio si `four_eyes_bypass` |
| `evidencia_adjunto_id` | uuid | FK attachments NULL | Norma, correo o acta |
| `superseded_by` | uuid | FK golden_signatures NULL | Firma que reemplaza a esta |

`UNIQUE(case_id, case_version)`. Índice por `company_id`.

### 3.3 `golden_signing_keys`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | uuid | PK |
| `company_id` | uuid | FK companies NOT NULL |
| `key_id` | text | NOT NULL — `UNIQUE(company_id, key_id)` |
| `algoritmo` | text | NOT NULL |
| `clave_publica` | text | NOT NULL (PEM/base64) |
| `credencial_id` | text | NULL — id del contador en el proveedor de identidad |
| `estado` | text | NOT NULL CHECK IN ('activa','retirada') |
| `retirada_en` | timestamptz | NULL |
| `motivo_retiro` | text | NULL |
| `creada_por` | uuid | FK users NOT NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

Las claves privadas **nunca** están en esta tabla. Ver §4.3.

### 3.4 Los archivos del repositorio

`fixtures/tax-scenarios/*.json` pasa a ser salida generada. Cada archivo:

```json
{
  "id": "IVA-01",
  "version": 1,
  "descripcion": "...",
  "origen": "real_anonimizado",
  "contenido": { "…": "mismo cuerpo que en DB" },
  "firma": {
    "estado": "SIGNED",
    "content_sha256": "…",
    "algoritmo": "ed25519",
    "key_id": "conta-2026",
    "firma": "base64…",
    "firmado_por": { "user_id": "…", "nombre": "…", "rol": "contador" },
    "firmado_en": "2026-10-07T15:04:22.118Z",
    "four_eyes_bypass": false,
    "evidencia_adjunto_id": "…"
  }
}
```

El hash se calcula sobre `{id, version, descripcion, origen, contenido}` — es decir, **todo
excepto el bloque `firma`**. Es la misma regla que ya usa `verifyFirma` hoy, con `version` añadido
para que dos versiones del mismo ID no colisionen.

### 3.5 El manifiesto

```json
{
  "matrizVersion": "<sha256 de la matriz firmada>",
  "generadoEn": "2026-10-07T15:05:00.000Z",
  "casos": ["IVA-01.json", "…"],
  "firmados": 12,
  "noEjecutables": 4,
  "umbralGolive": 30,
  "reglas": ["…"]
}
```

**Cambio importante:** `matrizVersion` hoy vale `"borrador-no-firmada"` y `casos` es una lista
manual. Al pasar a generado, el manifiesto es una foto verificable: si alguien edita un archivo a
mano, el hash de ese archivo deja de coincidir con su firma y `goldens:verify` falla.

---

## 4. Criptografía

### 4.1 Qué se firma y por qué

Un dorado firmado afirma tres cosas distintas, y conviene no confundirlas:

| Afirmación | Mecanismo |
|---|---|
| "El contenido es este y no cambió" | `content_sha256` (integridad) |
| "Fue el contador X quien lo firmó el día D" | FK `firmado_por` + `audit_events` (identidad y trazabilidad) |
| "Quien lo firmó es el titular de esta llave" | Firma digital (autenticidad criptográfica, verificable sin DB) |

Las dos primeras ya las resuelve el modelo de datos. La tercera es la que se decide en
`01-spec-firma-dorados.md §7` y que **no es una decisión técnica**.

### 4.2 Algoritmo

`ed25519`, por razones concretas y no por moda:

- Está en el runtime de Node (`node:crypto`), sin dependencia nueva.
- Firma de 64 bytes: el archivo firmado crece de forma insignificante.
- Verificación rápida sin dependencias: `crypto.verify(null, datos, clavePublica, firma)`.
- No tiene el problema de parameterización de RSA/ECDSA ni de Interpretation attacks de JSON.

Alternativa que el spec contempla y **no recomienda**: HMAC con clave del servidor. Verifica, pero
solo quien tenga la clave puede verificar, lo cual elimina el objetivo O5 (verificar sin el
sistema) y concentra la confianza en un secreto de infraestructura.

### 4.3 Dónde vive la clave privada

**Nunca en el repositorio ni en la base de datos.** Opciones, en orden de preferencia:

| Opción | Cómo | Cuándo aplica |
|---|---|---|
| **Llave del contador en su dispositivo** | El contador firma localmente y el sistema registra la clave pública | Si el contador elige Opción 2 (§7 de `01`) |
| **Firma autenticada por el sistema** | No hay clave privada; la firma la emite el servidor con la identidad de la sesión, y `algoritmo = hmac-sha256` | Si el contador elige Opción 1 |
| **Token firmado por el sistema** | El sistema firma el contenido con una clave de servicio por empresa, y `firmado_por` es un usuario real | Punto medio, útil si hay varios contadores y uno solo opera |

En los tres casos, `golden_signatures.firmado_por` apunta a un `users` real. **No se admite nunca
una firma cuyo `firmado_por` sea texto libre** (defecto D2, cerrado).

### 4.4 Qué se verifica y cuándo

| Momento | Qué se verifica | Por quién |
|---|---|---|
| Al firmar | El motor reproduce el esperado (O6) | Sistema |
| Al firmar | El firmante es `contador` de la empresa | Sistema, en la TX |
| Al firmar | El `content_sha256` del contenido a firmar | Sistema |
| Al exportar | Los archivos en disco coinciden con la DB | `goldens:export --check` |
| En CI | Cada archivo firmado verifica contra `clave_publica` | `goldens:verify` |
| Al activar una regla (ACC-03) | Los dorados usados están firmados **y** verifican | `activation-gate.ts` |
| En go-live | El conteo firmado ≥ 30 | `acceptance:gate --profile=golive` |

### 4.5 Clave rotada o revocada

Si `golden_signing_keys.estado = 'retirada'`, las firmas hechas con esa clave **siguen siendo
válidas** (una firma no caduca por cambiar de clave) pero la verificación debe *reportar* que la
clave está retirada, para que el auditor lo sepa. No se re-firma lo ya firmado: la historia es
inmutable.

---

## 5. Inmutabilidad

Trigger `golden_signed_immutable`, calcado del `rdf_immutable` existente:

```sql
CREATE OR REPLACE FUNCTION golden_signed_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD.estado IN ('SIGNED','SUPERSEDED','RETIRED') THEN
    IF NEW.contenido IS DISTINCT FROM OLD.contenido
       OR NEW.origen IS DISTINCT FROM OLD.origen
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.version IS DISTINCT FROM OLD.version THEN
      RAISE EXCEPTION 'GOLDEN_SIGNED_INMUTABLE: un dorado firmado no se modifica; cree uno nuevo con supersedes_id';
    END IF;
    IF NEW.estado NOT IN ('SIGNED','SUPERSEDED','RETIRED') THEN
      RAISE EXCEPTION 'GOLDEN_SIGNED_NO_REGRESAR: un dorado firmado no vuelve a CANDIDATO';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER golden_signed_immutable
  BEFORE UPDATE OR DELETE ON golden_cases
  FOR EACH ROW EXECUTE FUNCTION golden_signed_immutable();
```

Diferencia con el RDF, y es deliberada: el RDF permite `signed → applied` porque la activación de
la regla es un evento del sistema. Un dorado no tiene esa transición; se queda en `SIGNED` para
siempre y lo que cambia es su visibilidad (retirado, superado).

`DELETE` se rechaza siempre en `SIGNED`, con o sin trigger de aplicación, porque la evidencia
auditable no se borra (ADR-006: sin soft delete).

---

## 6. Auditoría

Cada transición escribe en `audit_events` dentro de la misma TX, con el patrón de
`src/modules/rdf/service.ts`:

| Acción | `before.status` | `after.status` | Campos clave en el registro |
|---|---|---|---|
| `create` | — | `CANDIDATO` | `id`, `tipo`, `origen` |
| `update` | anterior | igual | diff de `contenido` |
| `execute` | — | — | `pass`, `diff`, `ruleVersionId` |
| `submit` | `CANDIDATO` | `IN_REVIEW` | `id` |
| `return` | `IN_REVIEW` | `RETURNED` | `motivo` |
| `approve` | `IN_REVIEW` | `APPROVED` | `motivo` |
| `sign` | `APPROVED` | `SIGNED` | `contentSha256`, `algoritmo`, `keyId`, `fourEyesBypass` |
| `reject` | `IN_REVIEW` | `REJECTED` | `motivo` |
| `retire` | `SIGNED` | `RETIRED` | `motivo`, `decisionId` |
| `supersede` | `SIGNED` | `SUPERSEDED` | `supersedesId` |

**Regla:** el `audit.record()` va en la misma TX que el cambio. Si la TX aborta, no hay registro
fantasma; si el registro falla, el cambio no ocurre. Es el invariante que ya se cumple en el resto
del sistema y que `TODO.md` exige en F1.

---

## 7. RLS y aislamiento

- `golden_cases` y `golden_signatures` con RLS por `company_id`, siguiendo el patrón de
  `0022_tenant_rls_all.sql`.
- `golden_signing_keys`: lectura para `contador` y `auditor` de la empresa; escritura solo admin.
  La clave pública no es sensible; la privada no está aquí.
- Test de fuga obligatorio: un `contador` de la empresa A no lee ni firma un caso de la empresa B,
  y el hash de un caso de A no verifica contra la clave de B.

---

## 8. Migraciones

| Migración | Contenido |
|---|---|
| `0024_golden_cases.sql` | `golden_cases`, `golden_signatures`, `golden_signing_keys`, índices, uniques |
| `0025_golden_rls.sql` | RLS + policies de las 3 tablas |
| `0026_golden_immutable.sql` | Función + trigger `golden_signed_immutable` |
| `0027_golden_app_role.sql` | `GRANT` para `app_runtime` (patrón de `create-app-role.mjs`) |

Notas operativas, en el orden en que han mordido antes en este proyecto:

1. `create-app-role.mjs` tiene `default privileges`; si no se re-ejecuta tras crear las tablas,
   el rol de la aplicación no las ve (pasó con la migración 0023 del RDF).
2. Los CHECK de estados deben existir **antes** de que la aplicación escriba, no después.
3. El trigger se prueba en Neon dev con un caso firmado de verdad y un UPDATE fallido, no solo
   con un test de lectura.

---

## 9. Lo que este modelo NO cambia

- `tax-engine` no se toca. Ninguna columna, ninguna función de cálculo.
- El schema de `fixtures/tax-scenarios/schema.json` se conserva como **validación de forma** del
  archivo exportado; este spec define la **integridad y la identidad**, que es lo que falta.
- `_manifest.umbralGolive = 30` no cambia. El umbral es una decisión de negocio ya tomada.
- El RDF no se toca. La relación se agrega por FK (`golden_cases.decision_id`).