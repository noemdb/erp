# Validación y firma de dorados — índice del spec

> **Estado:** propuesta (sin ADR, sin migración, sin código) · **Dueño:** equipo + contador
> **Fecha:** 2026-10-07
> **Origen:** el gate de go-live exige 30 dorados firmados (`_manifest.umbralGolive=30`) y hoy hay
> **0**. El mecanismo para que el contador firme no existe como mecanismo: hoy es un ritual manual.
> **Regla de oro:** sin firma verificable no hay dorado; sin dorado firmado no hay go-live.

## Qué hay en esta carpeta

| Archivo | Responde |
|---|---|
| `01-spec-firma-dorados.md` | Problema, objetivos/no-objetivos, usuarios, flujo, estados, reglas de negocio, decisión que se escala al contador |
| `02-modelo-datos.md` | Esquema, migraciones, canonización, criptografía, auditoría, inmutabilidad |
| `03-api-ux.md` | Server Actions, Zod, rutas, RBAC, validaciones, errores, UI |
| `04-tests-rollout.md` | Aceptación, tests exigidos, gates, plan por fases, riesgos |

## Lectura rápida (60 segundos)

1. **Hoy "firmar" no es firmar.** Es escribir un nombre en un JSON y copiar un `sha256` de un
   mensaje de error. Eso prueba que el archivo no cambió, **no quién lo firmó**.
2. **Verificado:** cualquiera con permiso de escritura en `fixtures/` puede escribir
   `firmado_por: "Contador Juan Pérez"`, calcular el hash con 3 líneas de Node y pasar
   `verifyFirma`. Probado en esta revisión; el resultado es `{"firmado":true}`.
3. **Ya existe la solución a la mitad.** El módulo `rdf` (ADR-034) resolvió identidad, roles,
   auditoría, inmutabilidad, cuatro-ojos y hash canónico para las *decisiones fiscales*. Los
   dorados son el mismo problema con otro formato. **Este spec no inventa nada: reutiliza.**
4. **Falta el corredor, no la firma.** 5 de los 17 candidatos no son ejecutables hoy, y 2 de los
   12 restantes proban reglas que el motor **no implementa**. Firmarlos ahora produce dorados
   rojos o que no prueban nada.
5. **Decisión que NO es técnica:** si el contador necesita llave criptográfica propia o basta
   una firma autenticada dentro del sistema. Va planteada en `01` §7 con recomendación.

## Las tres cifras que mandan

| Cifra | Hoy | Para go-live |
|---|---|---|
| Dorados firmados | 0 | 30 |
| Candidatos ejecutables de los 17 | 12 | — |
| Candidatos que hay que redactar de cero | — | 18 |

Ver `04-tests-rollout.md §2` para el desglose, que es la acotación más importante de este spec:
**la meta de 30 no sale de los 17 candidatos, y conviene que el contador lo sepa antes de firmar
la matriz.**

Ver también: `blueprint/rdf/` (spec hermano, ADR-034), `fixtures/tax-scenarios/README.md`
(el ritual actual), `docs/DECISIONS.md` (ADR-020 cuatro-ojos pendiente de matriz),
`docs/TODO.md` (F0 dorados 🔲), `src/modules/rdf/service.ts` (el patrón a reutilizar).