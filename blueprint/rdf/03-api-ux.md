# 03 — API + UX RDF (planificado)

> Server Actions + Handlers de descarga. Sin API pública v1. Todo por `withTenant(ctx, fn)` + `authorize()` + RLS. Zod en servidor (autoridad).

## 3.1 Módulo y rutas

- Nuevo módulo `src/modules/rdf/` (`index.ts` público; `repo.ts` único con cliente DB; `service.ts` máquina de estados; `schemas.ts` Zod; `links.ts` cobertura).
- Rutas UI: `/c/[companyId]/decisiones` (bandeja: pendientes / firmadas / aplicadas), `/decisiones/nueva` (wizard 3 pasos: hecho→alternativas→decisión+firma), `/decisiones/[id]` (ficha + timeline + vínculos + evidencias).
- Docs UI: `/docs/datos-base/decisiones` (qué es un RDF, estados, cómo vincular). Sin tecnicismos.

## 3.2 Server Actions (contrato)

```ts
createDecision(companyId, input)          // docs.create (administrativo|contador). Reserva codigo en TX + audit.
updateDecisionDraft(id, patch)           // solo draft/returned. Version++ pre-firma.
submitDecision(id)                       // draft/returned → in_review. Exige decision + ejemplo + resultado_esperado.
returnDecision(id, { motivo })           // in_review/approved → draft (motivo≥10). Solo contador.
approveDecision(id)                      // in_review → approved. Solo contador.
signDecision(id, { firmante_nombre, firmante_doc, evidencia_adjunto_id? })  // approved → signed. Calcula content_sha256, congela. Solo contador.
linkDecisionToRule(decisionId, ruleId, { rol, nota? })    // crea link (decision draft..signed; rule draft/in_review/approved). Solo contador.
unlinkDecisionFromRule(linkId, { motivo })               // borra link solo si rule no active. Solo contador.
```

`withholding_rules` existentes ganan: `createDraft` acepta `source_decision_id?`; `activateRule` añade chequeo RDF (ver 3.4).

## 3.3 Zod (servidor, extracto)

```ts
DecisionBase = z.object({
  gap: z.enum(["G1","G2","G4","G8","G9","ISLR","OTRO"]),
  titulo: z.string().min(5).max(140),
  pregunta: z.string().min(10).max(2000),
  alternativas: z.array(z.object({
    letra: z.string().regex(/^[A-C]$/),
    descripcion: z.string().min(10).max(2000),
    impacto_numerico: z.string().max(500).optional(),
  })).min(1).max(3),
  decision: z.string().min(10).max(2000).optional(),       // exigible desde submit
  fundamento_normativo: z.string().min(10).max(2000).optional(),
  formula: z.string().max(1000).optional(),
  redondeo_metodo: z.enum(["HALF_UP","HALF_EVEN"]).nullable().optional(),
  redondeo_etapa: z.enum(["por_linea","por_total"]).nullable().optional(),
  redondeo_precision: z.number().int().min(0).max(6).nullable().optional(),
  momento_fiscal: z.string().max(500).optional(),
  ejemplo_numerico: z.record(z.string()).default({}),      // strings, montos como "1179.12"
  resultado_esperado: z.string().regex(/^\d+\.\d{2}$/).optional(),
  moneda: z.literal("VES"),                               // G4: solo VES hasta ADR-013
  rule_kind: z.enum(["iva","islr"]).nullable().optional(),
  concept_id: z.string().uuid().nullable().optional(),
  vigencia_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  impacto_sistema: z.string().max(1000).optional(),
});
SignInput = z.object({ firmante_nombre: z.string().min(5).max(140), firmante_doc: z.string().min(5).max(30), evidencia_adjunto_id: z.string().uuid().optional() });
```

Dinero siempre string; `decimal.js` para comparar `resultado_esperado` vs cómputo del ejemplo en preview (no persiste cálculo fiscal, solo validación de coherencia). ISLR con `concept_id` exige `rule_kind=islr` y viceversa.

## 3.4 Gate de activación (extiende ACC-03)

En `activateRule` (tras el chequeo de dorados existente):

```text
cobertura = EXISTS link r=autoriza
  JOIN fiscal_decisions d ON d.status IN ('signed','applied')
  WHERE d.company_id = rule.company_scope_key
    AND d.rule_kind = rule.rule_kind
    AND (rule.concept_id IS NULL AND d.concept_id IS NULL
         OR rule.concept_id = d.concept_id)
sin cobertura → { code: GATE_NO_RDF, message: "Regla sin RDF firmado vinculado con cobertura." }
```

Éxito: `UPDATE rules SET status='active'` + marca decisiones `signed→applied` (mismo TX) + audit de ambos. Nuevo código estable `GATE_NO_RDF` en `API.md` + `shared/errors`.

## 3.5 UX (es-VE, sin tecnicismos)

- Bandeja con KPIs: borradores, en revisión, firmadas sin aplicar, aplicadas. Filtros gap/estado/código. Tabla densa con estados en español.
- Wizard nueva: Paso 1 hecho (gap, título, pregunta, ejemplo como tabla clave→valor); Paso 2 alternativas A/B(/C) con impacto; Paso 3 decisión (fórmula, redondeo solo si G8, momento, resultado esperado, vigencia) → preview del hash canónico (solo informativo pre-firma).
- Detalle: ficha inmutable si `signed/applied` (banner "Firmado · sha256 …"), timeline (quién→qué→cuándo), pestaña Vínculos (reglas cubiertas vs pendientes, botón Vincular con selector de regla + rol), pestaña Evidencia (PDF firmado vía adjunto + descarga HMAC+TTL).
- Permisos en UI: botones por `canWrite` (administrativo/contador crean; solo contador aprueba/firma/vincula); resto ve "Ver ficha". Errores en lenguaje contador (`GATE_NO_RDF` → "Esta regla aún no tiene una decisión firmada que la autorice. Vincule un RDF firmado con el mismo impuesto/concepto.").

## 3.6 Handlers

- `GET /api/companies/[id]/decisiones/export?formato=csv`: columnas `codigo,estado,gap,titulo,resultado_esperado,firmante,firmado_en,sha256`; anti-inyección `=+-@`; requiere `reports.read`.
- Descarga de evidencia reutiliza `GET .../archivos/[id]` existente (sin handler nuevo).
