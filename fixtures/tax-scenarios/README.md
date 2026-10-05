# Escenarios dorados (F0/F2)

Resueltos a mano por el contador. Cada JSON: entradas del motor + esperado. El test `engine.test.ts` los carga todos: objetivo 100% verdes (gate F2).

Formato: `{ id, descripcion, doc?, iva?, islr?, nc?, esperado }`. Agregar 30–50 antes de cerrar F2.

## Firmar un escenario (ACC-02/ACC-03)

1. Resuélvelo a mano y escribe el JSON con `estado: "VALIDADO_CONTADOR"` y `firma: { firmado_por, fecha, fuente_legal }` (sin `sha256_contenido` aún).
2. Corre `npm run goldens:check`: fallará con `FIRMA <id>: sha256_contenido no coincide (esperado <hash>)`.
3. Copia ese `<hash>` a `firma.sha256_contenido` y repite: `goldens ok (N fixtures, M firmados)`.
4. El hash cubre todo el contenido menos el bloque `firma` (incluye `estado`): cualquier edición posterior invalida la firma y el gate ACC-03 bloquea la activación hasta re-firmar.
