# 03 — API, UI y permisos

> **Estado:** propuesta · **Fecha:** 2026-10-07 · **Hermano:** `blueprint/rdf/03-api-ux.md`
> **Convención:** Server Actions para UI, Route Handlers solo para export/download.
> Todo acceso: `withTenant(ctx, fn)` + `authorize()` + RLS. DB solo en `modules/goldens/repo`.

---

## 1. Rutas

### 1.1 En el panel de empresa

| Ruta | Rol | Qué hace |
|---|---|---|
| `/c/[companyId]/dorados` | todos con `goldens.read` | Bandeja: estado, tipo, cobertura por regla, diferencias |
| `/c/[companyId]/dorados/[id]` | todos con `goldens.read` | Ficha: entradas, esperado, ejecución, diff, historial de firmas |
| `/c/[companyId]/dorados/[id]/firmar` | solo `contador` | Dialog de firma (nombre, documento, evidencia, motivo si bypass) |
| `/c/[companyId]/dorados/nuevo` | `contador` + equipo | Redactor del caso con validación en vivo |
| `/c/[companyId]/dorados/cobertura` | `contador` + `auditor` | Qué regla no tiene dorado firmado |

### 1.2 Handles

| Ruta | Propósito |
|---|---|
| `GET /api/companies/[id]/goldens?format=csv` | Export CSV con anti-inyección (patrón `/decisiones`) |
| `GET /api/companies/[id]/goldens/firma/[id]` | Certificado de firma: PDF con el contenido, hash y datos del firmante |

El segundo es lo que el contador se lleva como evidencia: una hoja con el caso, el número que
firmó, el hash y su nombre. Es el equivalente en papel de la firma antigua, pero con el hash que
permite verificar que el papel no fue alterado.

---

## 2. Server Actions

Todas reciben `companyId` explícito y resuelven el contexto con `withTenant`. Patrón de
`src/modules/rdf/actions.ts`.

| Action | Permiso | Entrada | Salida |
|---|---|---|---|
| `createGoldenCaseAction` | `goldens.write` | `{ id, tipo, descripcion, origen, contenido }` | `{ ok, id }` |
| `updateGoldenCaseAction` | `goldens.write` | `{ id, contenido, descripcion? }` | `{ ok }` |
| `executeGoldenCaseAction` | `goldens.write` | `{ id }` | `{ ok, pass, diff }` |
| `submitGoldenAction` | `goldens.write` | `{ id }` | `{ ok }` |
| `returnGoldenAction` | `goldens.sign` | `{ id, motivo }` | `{ ok }` |
| `approveGoldenAction` | `goldens.sign` | `{ id }` | `{ ok }` |
| `signGoldenCaseAction` | `goldens.sign` | `{ id, firmanteNombre, firmanteDoc, evidenciaAdjuntoId?, motivo? }` | `{ ok, contentSha256, firma }` |
| `rejectGoldenAction` | `goldens.sign` | `{ id, motivo }` | `{ ok }` |
| `retireGoldenAction` | `goldens.sign` | `{ id, motivo, decisionId? }` | `{ ok }` |
| `registerSigningKeyAction` | `goldens.admin` | `{ keyId, algoritmo, clavePublica, credencialId? }` | `{ ok }` |
| `retireSigningKeyAction` | `goldens.admin` | `{ keyId, motivo }` | `{ ok }` |
| `exportGoldensAction` | `goldens.read` | `{ id }` | certificado PDF |

**RBAC en el permiso, no en la UI.** `authorize()` se llama en el servicio; la UI solo oculta
botones. Una llamada directa a la action sin rol devuelve `FORBIDDEN` igual que si el botón
existiera.

---

## 3. Errores

Se reutiliza el sobre de `docs/API.md`. Códigos nuevos, con el prefijo `GOLDEN_`:

| Código | Cuándo | Mensaje al usuario |
|---|---|---|
| `GOLDEN_NOT_REPRODUCED` | El motor no da el esperado (RG-03) | `El sistema calcula X y el caso dice Y. Corrige el esperado o la entrada antes de firmar.` |
| `GOLDEN_ALREADY_SIGNED` | Firmar un caso `SIGNED` | `Este dorado ya está firmado. Crea una versión nueva si necesitas cambiarlo.` |
| `GOLDEN_NOT_EXECUTABLE` | Firmar un caso sin corredor (`NOT_EXECUTABLE`) | `Este caso no tiene forma de verificarse automáticamente; márcalo como no ejecutable o agregale un corredor.` |
| `GOLDEN_FOUR_EYES` | Firma de quien redactó con otro contador disponible, sin motivo | `Cuatro-ojos: quien preparó no firma sin motivo cuando hay otro contador.` |
| `GOLDEN_COVERAGE` | Activar regla sin dorado firmado | `Sin dorados firmados que cubran {ruleKind}.` (ya existe como `GATE_NO_COVERAGE`) |
| `GOLDEN_EXPORT_DRIFT` | `export --check` con diferencia DB↔disco | `Los archivos de fixtures no coinciden con la base de datos. Corre goldens:export.` |

`GOLDEN_NOT_REPRODUCED` es el más importante: es el que impide que un dorado firmado describa un
cálculo que el sistema no hace.

---

## 4. Validación (Zod, servidor como autoridad)

### 4.1 `GoldenContentSchema`

```ts
export const GoldenContentSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("iva"),
    empresa: z.object({ agenteRetencion: z.boolean() }),
    tercero: z.object({ sujetoRetencion: z.boolean(), tipoPersona: z.enum(["natural","juridica"]) }),
    baseImponible: MoneySchema,
    alicuota: FraccionSchema,          // "0.16", nunca "16"
    ivaCausado: MoneySchema,
    porcentajeRetencion: FraccionSchema,
    esperado: z.discriminatedUnion("resultado", [
      z.object({ resultado: z.literal("aplica"), retenido: MoneySchema }),
      z.object({ resultado: z.literal("no_aplica"), motivo: z.enum([...]) }),
    ]),
  }),
  z.object({ tipo: z.literal("islr"), /* … */ }),
  z.object({ tipo: z.literal("evento_retencion"), /* … */ }),
]);
```

Tres reglas que el schema hace obligatorias y que hoy no lo son:

1. **`FraccionSchema` rechaza valores > 1.** Cierra el defecto de escala (Q-05 del consolidado
   QUINTA_REV): un `"16"` donde el motor espera `"0.16"` falla en el borde, con un mensaje que
   dice `usa 0.16, no 16`.
2. **`esperado` es discriminado**: o aplica con un monto, o no aplica con un motivo de la lista
   cerrada. Nunca "0,00" para decir "no aplica" (que es lo que hace IVA-03 hoy, y por eso no se
   puede distinguir de "se retuvo cero").
3. **`esperado` no puede calcularse con la función que se prueba.** El redactor escribe el número;
   el motor lo verifica. Si el sistema lo calculara, el dorado no probaría nada.

### 4.2 `SignSchema`

```ts
export const SignSchema = z.object({
  firmanteNombre: z.string().trim().min(3).max(120),
  firmanteDoc: z.string().trim().min(6).max(20),     // cédula o RIF
  evidenciaAdjuntoId: z.string().uuid().optional(),
  motivo: z.string().trim().min(10).optional(),
});
```

Igual que el del RDF. La diferencia es que en el servicio de dorados `firmanteNombre`/`Doc` se
conservan **como respaldo legible** de la identidad, que además es la FK a `users`.

---

## 5. UI

### 5.1 Bandeja

```
Dorados                                          [Nuevo caso]  [Exportar CSV]

┌──────────────────────────────────────────────────────────────────────────┐
│ Cobertura de reglas                                                      │
│ IVA 75 %      ▓▓▓▓▓▓▓░░░  7/10 firmados    ISLR HON   ▓▓░░░░░░░░  0/4   │
│ IVA 100 %     ▓░░░░░░░░░  0/3                ISLR COM   ░░░░░░░░░░  0/2   │
│ G8 redondeo   ▓▓▓▓░░░░░░  3/4                G2 abono   ░░░░░░░░░░  0/3   │
└──────────────────────────────────────────────────────────────────────────┘

ID         Descripción                     Tipo    Origen        Estado      Resultado
IVA-01     Compra servicio 1000 + IVA 16%   iva     sintético     CANDIDATO   ✓ reproduce
IVA-03     Contribuyente formal, no retiene iva     real anon.    IN_REVIEW   ✗ diff
ISLR-07    Factura 50.000 en 2 abonos       islr     sintético     CANDIDATO   — sin corredor
ABONO-01   Abono 10/09, pago 05/10          evento  sintético     NOT_EXEC.   — sin corredor
```

Filtros: estado, tipo, origen, regla cubierta, solo con diferencias. Orden por defecto:
`SIGNED` primero, luego los que difieren, luego el resto.

### 5.2 Ficha

Cuatro pestañas, en este orden porque es el orden en que se lee un caso fiscal:

1. **Caso** — descripción, origen, entradas del motor, esperado, fórmula. Solo lectura desde
   `IN_REVIEW`.
2. **Ejecución** — botón "Ejecutar contra el motor", resultado línea por línea, y el diff
   resaltado si no reproduce. `explanation[]` del motor tal cual, que es lo que permite entender
   por qué difiere.
3. **Firmas** — historial completo: quién, cuándo, hash, algoritmo, bypass, evidencia. Firma
   vigente destacada.
4. **Trazabilidad** — RDF vinculado (`decision_id`), regla que cubre, bitácora de auditoría del
   caso.

### 5.3 Dialog de firma

Campos: nombre, cédula/RIF, evidencia (adjunto), y **motivo** que aparece solo si el firmante es
el redactor y hay otro contador en la empresa. Antes de confirmar, se muestra en el mismo dialog:

```text
┌─ Firmar dorado ───────────────────────────────────────────────┐
│ IVA-03 · Compra contribuyente formal                          │
│                                                              │
│ Base 1.000,00 · IVA 160,00 · Retención 0,00 (no aplica)      │
│ Reproduce contra el motor: ✓                                  │
│                                                              │
│ Contenido: 8f2a…c41d  (sha256)                              │
│ Regla de la decisión: RDF-2026-0003 · G2                     │
│                                                              │
│ Nombre [_______________________]  Cédula/RIF [__________]   │
│ Evidencia (PDF del acta) [Subir]                             │
│                                                              │
│ ⚠ Firmaste el caso que redactaste y hay otro contador en la   │
│   empresa. Indica el motivo (queda en la auditoría).          │
│   Motivo [______________________________________________]     │
│                                                              │
│                      [Cancelar]  [Firmar]                     │
└──────────────────────────────────────────────────────────────┘
```

**Decisión de diseño:** el dialog muestra el hash **antes** de firmar. El contador ve exactamente
lo que está firmando, y el hash que aparece es el que quedará registrado. Es la diferencia entre
"copiar un hash de un error" y "firmar un documento que te muestran".

### 5.4 Cobertura

Pantalla que responde la pregunta que el contador se hará constantly: "¿ya puedo activar esta
regla?". Por cada `withholding_rules` no sintética: cuántos dorados firmados la cubren, cuántos
faltan para el umbral, y el botón "crear dorado para esta regla" que abre el redactor con la
regla ya seleccionada.

Es la misma información que da `GATE_NO_COVERAGE` / `GATE_NO_RDF`, pero antes de intentar activar.

---

## 6. Accesibilidad y detalles de mesa que importan

| Detalle | Por qué |
|---|---|
| Toda tabla con `scope="col"` y encabezados asociados | Auditoría por teclado y lector de pantalla |
| El diff no se comunica solo por color | ADA/uso real: prefijo `+`/`−` además del color |
| El dialog atrapa el foco y devuelve el foco al abrirlo | Con teclado, el foco se pierde en la página de fondo |
| Importes siempre con el separador de miles y 2 decimales | Evitar que `1.179,12` se lea como `1.17912` o `1179,12` |
| Fechas en ISO en `title`, legibles en pantalla | Copy-paste al acta y a la bitácora |
| Botón de firmar deshabilitado con el motivo visible | Nunca un botón muerto: se explica por qué |

---

## 7. Documentación a actualizar en el momento

`AGENTS.md §3` exige documentar en `API.md` el bloque que expone API. Cuando se implemente:

| Doc | Qué se agrega |
|---|---|
| `docs/API.md` | Las 12 actions, los 2 handles, los 6 códigos `GOLDEN_*` |
| `docs/DATABASE.md` | Las 3 tablas, RLS, trigger, `golden_signed_immutable` |
| `docs/DOMAIN.md` | Invariante `I-GD-1`: firmado es inmutable + RG-03 |
| `docs/SECURITY.md` | RBAC `goldens.*`, política de llaves, qué se exporta |
| `docs/CONVENTIONS.md` | `modules/goldens/`, canónico único en `modules/shared/` |
| `docs/DECISIONS.md` | ADR-035 (mecanismo) + ADR-036 (respuesta a §7 del spec 01) |
| `docs/TODO.md` | El bloque F0 de dorados, que pasa de "sin mecanismo" a "con mecanismo" |
| `fixtures/tax-scenarios/README.md` | Se reescribe: el ritual del hash desaparece |

---

## 8. Lo que no se expone

| No | Razón |
|---|---|
| Endpoint público de verificación | No hay API pública en v1. La verificación offline es el script `goldens:verify`, no un servicio |
| Borrado de dorados | Un dorado `SIGNED` no se borra (ADR-006). `RETIRED` es el final |
| Firma en lote | "Firmar 8 casos a la vez" temptations la auditoría por caso. Uno por uno, con su diálogo |
| Edición del esperado desde la ficha en revisión | Si se puede editar, el hash de la firma deja de servir. Se devuelve el caso |
| API para crear dorados desde outside | Solo Server Actions del panel, para que la autorización pase por `authorize()` |