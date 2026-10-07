# 04 — Tests + rollout RDF (planificado)

## 4.1 Aceptación del bloque (checklist Paso 04)

- [ ] Funciona + errores/casos límite (máquina de estados, cobertura, inmutabilidad, concurrencia de `codigo`).
- [ ] Tests: unit + repo en Neon dev (RLS/trigger/`UNIQUE`) + fuga tenants + `sha256` reproducible + Playwright por rol.
- [ ] Sentido dominio: vocabulario `DOMAIN.md`, estados y gates coherentes con F0.
- [ ] API documentada (`docs/API.md`), SECURITY revisado (RBAC + RLS + adjuntos), ADR-034 aceptado (no editar pasado).
- [ ] Sin dato real sin anonimizar; sin PII en logs (pino redacta firmante_doc en logs, visible solo en UI con permiso).

## 4.2 Tests exigidos

| Garantía | Mecanismo |
|---|---|
| Máquina de estados | Vitest: transiciones válidas/inválidas, `INVALID_STATE_TRANSITION`, motivo obligatorio, firmante obligatorio, `DECISION_LOCKED` en regla aprobada |
| Inmutabilidad firmado | Test repo: `UPDATE` en `signed/applied` → `RDF_IMMUTABLE`; `signed→applied` por sistema OK |
| Cobertura de activación | Unit `links.ts` + servicio: sin link → `GATE_NO_RDF`; link `aclara` solo → `GATE_NO_RDF`; link `autoriza` con concept distinto → `GATE_NO_RDF`; link correcto → activa y marca `applied` |
| `sha256` reproducible | Mismo contenido → mismo hash; reordenar claves no cambia; `number` en ejemplo se rechaza (Zod string-only) |
| Concurrencia `codigo` | 50 creaciones paralelas misma empresa/año: 0 duplicados, 0 reutilizados tras `rejected` |
| Fuga tenants | Matriz cross-company por action (crear/leer/firmar/vincular/exportar A→B falla) + RLS con `app_runtime` |
| E2E Playwright | Contador crea→firma→vincula→activa; administrativo prepara pero no firma (negativa); auditor solo lee; export CSV con anti-inyección |
| Trazabilidad | Desde comprobante emitido: `rule_version_id` → `source_decision_id`/links → RDF `codigo` + `sha256` + auditoría |

## 4.3 Plan por fases (no construir aún)

**Fase 0 — ADR-034 (0.5d).** Aceptar spec + registrar decisión. Sin código.
**Fase 1 — RDF standalone (3–4d).** Migración + `modules/rdf` + bandeja/wizard/detalle + export CSV + tests estado/hash/fuga. Sin gate todavía (las reglas se activan como hoy + advertencia "sin RDF").
**Fase 2 — Asociación + gate (2–3d).** `source_decision_id` + links + `GATE_NO_RDF` en `activateRule` + marcado `applied` + E2E + drill-down comprobante→RDF.
**Fase 3 — Cierre T03 (externo).** Contador firma RDF G1/G2/G8/G9/G4 + ADR-033 con el sistema; T04 consume RDF en vez de actas sueltas.

Orden con CUARTA_REV: Fase 0 ya (desbloquea diseño); Fase 1 en Sprint 2 junto a T04; Fase 2 antes de activar valores reales (T05/T10); Fase 3 es la salida de T03.

## 4.4 Riesgos y decisiones abiertas

| Riesgo | Mitigación | Estado |
|---|---|---|
| Cuatro-ojos sin matriz de usuarios (ADR-020) | Soft-block preparador=firmante + motivo auditado | Documentar, no bloquear |
| G4 decide excluir FX de v1 | RDF tipo `OTRO` con decisión "diferido formalmente"; gate no exige RDF para reglas inexistentes | Requiere decisión §14 roadmap |
| Reglas históricas sin RDF | `source_decision_id NULL` + `synthetic=true`; no inventar autoría | Aceptado en spec |
| Adjunto firmado pesado | Reutilizar `attachments` (UploadThing/fs, dedup, HMAC+TTL); límite `MAX_UPLOAD_MB` | Sin infra nueva |
| Inflar scope (PKI, BPMN) | No-objetivos §01-2; cualquier extensión = ADR nuevo | Freno explícito |

## 4.5 Respuesta a las 5 preguntas finales (roadmap §21)

1. ¿Reglas decididas y firmadas? → Sí trazable: cada regla activa cita su RDF.
2. ¿Dorados reproducidos? → Sin cambio: ACC-03 sigue + cobertura RDF.
3. ¿Período real reproducido? → El M5 puede citar RDF por diferencia D3 (criterio).
4. ¿Usuarios lo demuestran? → UAT-05/06/08 usan RDF como evidencia, no capturas sueltas.
5. ¿Evidencia para operar? → Ficha RDF + `sha256` + auditoría + adjunto = paquete contador/auditor.
