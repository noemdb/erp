# 01 — Spec RDF: decisión fiscal trazable + asociación a regla

> **Tipo:** spec staff-engineer · **No es código** · Implementar solo tras ADR-034 aceptado.

## 1. Problema

La sesión práctica de 6 pasos funciona en pantalla, pero su resultado vive en
memoria y en actas sueltas. Sin un objeto de dominio que capture cada decisión
fiscal (G1/G2/G8/G9/G4, base ISLR, UT, mínimos, ADR-033), ocurren tres fallos:

1. Se programa contra una conversación verbal y luego la tasa/método cambia.
2. No se puede responder "¿por qué este comprobante usó 75 % y redondeo por línea?" con un vínculo dato→decisión→regla→comprobante.
3. El gate de activación de reglas (ACC-03) verifica dorados firmados, pero no verifica que exista una decisión firmada que autorice la regla.

## 2. Objetivos / no-objetivos

**Objetivos:**
- Entidad `fiscal_decisions` (RDF) por empresa: crear, revisar, aprobar, firmar, aplicar, superseder. Firmado = inmutable.
- Asociación explícita RDF↔regla vía `fiscal_decision_links` + `withholding_rules.source_decision_id` (trazabilidad, no edición histórica).
- Puerta de activación: regla no sintética solo se activa con ≥1 RDF firmado vinculado de cobertura matching (`rule_kind` + `concept_id`).
- UI por rol en `/c/[companyId]/decisiones` + detalle + vínculo a regla; auditoría y `sha256` del contenido firmado.

**No-objetivos (no construir):**
- Firma criptográfica externa / PKI / timestamping. Firma = aprobación registrada por contador con hash `sha256` canónico + opcional adjunto PDF firmado (vía módulo `attachments` existente).
- Workflow genérico BPMN o DSL de reglas. Estados fijos, transiciones estrictas.
- Editar historia: firmado/superseded nunca se reescriben; corrección = nuevo RDF con `supersedes_id`.
- Cambiar `tax-engine`: el motor sigue puro y recibe reglas filtradas; el RDF no entra al cálculo, solo autoriza la regla.
- Resolver G4/G8/G9 en este spec: el spec da el vehículo; el contenido fiscal lo firma el contador en cada RDF.

## 3. Usuarios y permisos (RBAC rol×empresa)

| Acción | Administrativo | Contador | Auditor | Admin sistema |
|---|---|---|---|---|
| Crear/editar borrador, enviar a revisión | ✅ | ✅ | — | — |
| Devolver a borrador, aprobar | — | ✅ | — | — |
| Firmar (inmutable + `sha256`) | — | ✅ | — | — |
| Vincular/desvincular RDF↔regla (borrador) | — | ✅ | — | — |
| Leer todo + exportar CSV | propia empresa | ✅ | ✅ solo lectura | — (solo usuarios/empresas) |

Nota cuatro-ojos (ADR-020 pendiente de matriz): por defecto, quien prepara el
borrador no debería ser quien firma si hay ≥2 contadores en la empresa. Se
documenta como advertencia (soft-block con confirmación), no como bloqueo duro,
hasta que la matriz de usuarios lo confirme. Sin segundo contador, se permite
auto-firma con motivo auditado.

## 4. Flujo (máquina de estados)

```text
draft → in_review → approved → signed → applied
  ↑          ↓           ↓          ↓
  └──── returned ───────┘     superseded (por nuevo RDF con supersedes_id)
                └→ rejected (terminal informativo, con motivo)
```

- `draft`: editable por administrativo/contador. Sin número definitivo (código provisional `RDF-YYYY-####` reservado en TX al crear).
- `in_review`: solo contador mueve. Requiere ejemplo numérico + resultado esperado completos.
- `approved`: decisión aceptada, aún mutable solo vía retorno a `draft` (con motivo).
- `signed`: **inmutable**. Se congela `content_sha256` (canónico JSON) + snapshot de campos + firmante + fecha. Cualquier corrección posterior = nuevo RDF.
- `applied`: al menos un vínculo a regla activa. Se marca por sistema al activar la regla vinculada; si la regla se supersede, el RDF sigue `signed` (historia preservada) y el nuevo ciclo usa nuevo RDF o el mismo si su alcance lo cubre.
- `rejected` / `superseded`: terminales, con motivo, nunca se borran.

Transiciones inválidas → `INVALID_STATE_TRANSITION`. Período `closed` no bloquea RDF (es decisión, no documento fiscal), pero vincular a regla con vigencia en período cerrado exige reapertura o vigencia futura.

## 5. Contenido mínimo del RDF (campos, despacio)

Identidad: `id` (uuid), `company_id`, `codigo` (`RDF-YYYY-####` único por empresa, generado en TX con `UPDATE series RETURNING`-like sobre secuencia propia `rdf_series`; sin huecos reutilizados, huecos por rollback no se rellenan), `gap` (G1/G2/G4/G8/G9/ISLR/OTRO), `titulo`, `pregunta`.

Alternativas: `alternativas[]` ({letra, descripción, impacto numérico en mes de muestra}) — mínimo 1, recomendado ≥2 para G8/G2.

Decisión: `decision` (1 frase), `fundamento_normativo` (norma + artículo + cotejo Gaceta; puede ser "criterio contador" con justificación cuando la norma remite a práctica), `formula` (texto + variables del dominio: `base_imponible`, `alícuota`, etc.), `redondeo_metodo/etapa/precision` (nullable salvo G8), `momento_fiscal` (qué fecha manda), `ejemplo_numerico` (entradas congeladas), `resultado_esperado` (string 2 decimales + moneda), `regla_afectada` (rule_kind/concept_id/vigencia prevista), `impacto_sistema` (qué ADR/regla/dorado toca).

Firma: `firmante_nombre`, `firmante_doc`, `firmado_por` (userId contador), `firmado_en`, `content_sha256`, `evidencia_adjunto_id?` (FK `attachments`, PDF firmado opcional).

Trazabilidad: `status`, `version` (1 + incrementos solo pre-firma), `supersedes_id?`, `motivo` (para returned/rejected/supersede), `created_by`, `created_at`, `updated_at`.

Idioma ubicuo obligatorio (`DOMAIN.md`): `base_imponible` (no `subtotal`), `comprobante` (no `certificado`), `alícuota` en UI para IVA (retención ISLR usa `porcentaje`), retención ≠ descuento.

## 6. Asociación RDF↔regla (el segundo pedido: "asociarla como regla")

Dos mecanismos complementarios, ambos explícitos:

**a) Puente N:M `fiscal_decision_links`** (`decision_id`, `rule_id`, `rol` ∈ {autoriza, aclara, deroga}, `nota?`, `created_by/at`). Permite que un RDF autorice varias reglas (p. ej. G8 autoriza IVA-01 + IVA-02) y que una regla cite varios RDF (G2 + base ISLR).

**b) Atajo 1:N `withholding_rules.source_decision_id`** (nullable FK, migración aditiva). La regla nace del RDF que la autoriza; el puente cubre citas adicionales. No se permite cambiar `source_decision_id` una vez la regla está `approved/active` (requiere nueva regla).

**Cobertura (matching) para activar:** existe link con `rol=autoriza` donde `decisions.status=signed/applied`, `decisions.company_id = rules.company_scope_key`, `decisions.rule_kind = rules.rule_kind`, y (`rules.concept_id IS NULL` → `decisions.concept_id IS NULL`; ISLR → `concept_id` igual). G8-metodológico (sin concept_id) autoriza reglas IVA; no autoriza ISLR por concepto salvo link explícito por concepto.

**Efecto en el gate existente:** `transition(... → active)` mantiene el chequeo ACC-03 (dorados firmados) y añade chequeo RDF (decisión firmada vinculada con cobertura). Sin cobertura → `GATE_NO_RDF` (nuevo código, ver `03-api-ux.md`). Reglas `synthetic=true` quedan exentas en dev pero nunca activables en prod (ya vigente).

## 7. Invariantes (dominio)

- **I-RDF-1:** firmado es inmutable (app + `REVOKE UPDATE/DELETE` + trigger que rechaza mutación salvo transición `signed→applied` por sistema).
- **I-RDF-2:** `codigo` único por empresa, nunca reutilizado.
- **I-RDF-3:** activación de regla no sintética exige cobertura RDF firmada (fail-closed).
- **I-RDF-4:** todo cambio de estado escribe `audit_events` en la misma TX con antes/después + motivo cuando aplique.
- **I-RDF-5:** el RDF no altera cálculos históricos: comprobantes ya emitidos conservan su `rule_snapshot`; nueva regla solo aplica hacia adelante.
