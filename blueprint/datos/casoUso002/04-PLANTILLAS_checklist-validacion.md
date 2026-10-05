# Checklist de Validación — Sesión de Prácticas

## Aislamiento multiempresa

- [ ] Crear 2da empresa "Demo 2" y verificar que no ve datos de "Distribuidora Los Andes".
- [ ] `withTenant` aplica RLS en todas las consultas.
- [ ] Fuga de tenants: test automático verde.

## Inmutabilidad

- [ ] Comprobante emitido no editable.
- [ ] Audit log append-only (sin UPDATE/DELETE).
- [ ] Trigger anti-mutación en períodos cerrados activo.

## Reproducibilidad

- [ ] `sha256` de libro estable en 2 corridas.
- [ ] `closure_hash` estable con mismos insumos.
- [ ] `pdf_sha256` estable.
- [ ] `rule_version_id` + `explanation[]` en cada cálculo.

## Trazabilidad

- [ ] Cada cálculo tiene `rule_version_id`.
- [ ] Cada documento tiene audit de creación/modificación.
- [ ] Drill-down funcional en libros.
- [ ] `source_files.sha256` en importaciones.

## Seguridad

- [ ] Solo contador emite/reglas/cierre (probar con adminis → debe fallar).
- [ ] RLS activa.
- [ ] `secrets:scan` limpio post-sesión.
- [ ] No hay PII en logs.

## Fiscal

- [ ] IVA calculado correctamente (16 %).
- [ ] Retención IVA 75 % correcta.
- [ ] Retención ISLR 5 % (servicios) correcta.
- [ ] Serie sin huecos.
- [ ] Período fiscal 2026-10 correcto.
- [ ] Libros cuadran con §05.

## Excel/PDF

- [ ] PDF formato correcto (Chrome 154).
- [ ] Excel contra golden (mapa de celdas).
- [ ] Paridad art. 16.
- [ ] Render fuera de TX.

## G2 / Eventos

- [ ] `abono_criterion = unset` ⇒ fail-closed.
- [ ] `G2_EVENT_REVIEW_REQUIRED` emitido.
- [ ] IVA **no** consume eventos (T07 pendiente).
- [ ] Solo contador cambia criterio.

**Firma auditor:** ________________