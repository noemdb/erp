# Runbook — Actualización de reglas tributarias

1. Contador entrega providencia/decreto + vigencia + parámetros + ejemplo numérico.
2. Solo contador: insertar fila en `withholding_rules` con `effective_range` desde la vigencia (no editar la anterior; el EXCLUDE impide solapes). Actualizar `docs/anexos/matriz-reglas-v1.md`.
3. Agregar el ejemplo como fixture en `fixtures/tax-scenarios/` y correr `npm test` (gate: 100% verdes).
4. Los cálculos históricos no cambian: cada comprobante guarda `rule_version_id` + snapshot.
