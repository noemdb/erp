# Retrospectiva — simulación #2 (rerun septiembre-2025)

Rerun ejecutado con `guia-rerun-limpio.md` tras limpieza total (`sim:limpieza-caso003`,
verificación todo-0). Lote nuevo `9740a7bd`, 10 documentos, evento `f0d789e4`.

## Guías: qué funcionó y qué se ajustó

* `guia-rerun-limpio.md` predijo cada pantalla (Validado 10/0/9/1, Parcial 9+1, aviso G2,
  rechazo NC, columnas ignoradas). Cero sorpresas en intake: la guía ya contiene todos
  los aprendizajes de la corrida 1.
* `guia-simulacion-maria.md` (original ideal) y `escenario-02-revision-estado-real.md`
  siguen vigentes como contexto; el rerun no les encontró desvíos nuevos.
* Ajustes aplicados durante la marcha: nomenclatura a kebab-case (7 archivos),
  comando `sim:limpieza-caso003` con fallback `DIRECT_URL` y guarda que sí detiene el
  script, corrección de `payment_id` y del citado `:'company'` en el SQL.

## Resultados de la interacción (evidencia)

* Intake: lote `Validado`, `Total 10 | Válidas 0 | Advertencias 9 | Rechazadas 1`
  (9× tercero nuevo + aviso abono fila 5; fila 9 NC rechazada; filas 3-4 sin aviso).
* Confirmación: `Creados 9, omitidos 0, rechazados 1` → `Parcial`.
* NC a la primera: `credit_note 001-00004/12348`, afectado `001-00001`, fechas
  `2025-09-10/11/10`. Compras: 10 docs, `Base 10.000 / IVA 1.588,15`.
* Trazabilidad: `001-00001` → archivo `compras-septiembre-2025-rerun.csv` + fila 1 +
  enlace al lote; período `01-09-2025 → 01-10-2025`; Inv.1 verificado.
* Evento G2: `Pago 06-09-2025 × 1.500,00` asignado a `004-00099`
  (`Asignado 1.500 / Disponible 0`). Método quedó `Transferencia` (sin soporte:
  deuda menor repetida de la corrida 1).
* Activaciones: `agente IVA ✓` + 6 perfiles `sujeto IVA = sí` con vigencia desde
  `01-01-2025`.
* Preview IVA 9 facturas: `Regla 75%`, total `1.179,12`, línea por línea verificado
  (`120,00 / 120,04 / 240,08 / 9,00 / 30,00 / 144,00 / 60,00 / 360,00 / 96,00`).
  Sin emitir.
* Barrido ISLR 6/6 conceptos (`HON COM ALQ PUB TRA SER`): todos `Divergen`, ambos
  escenarios `No evaluable — sin regla vigente`. Gate fiscal documentado, 0 números
  consumidos.
* Cierre: bitácora `Compra+create` = 10 eventos (9 importación + NC); timelines de lote,
  NC manual y `001-00001` verificados; 2 CSV exportados.

## Hallazgos nuevos (no estaban en la retrospectiva 1)

1. **Alícuota en dos escalas**: importadas muestran `0.160000` (fracción derivada
   `iva/base`), manuales `16.000000` (porciento del formulario). Mismo campo, dos
   escalas: deuda de normalización para el contador (el preview usa montos, no la
   alícuota, así que no altera el cálculo).
2. **Redondeo por línea vs por total (G8 en vivo)**: `75% × 1.572,15 = 1.179,1125`
   daría `1.179,11` redondeando el total; el motor redondea por línea y suma:
   `1.179,12`. Diferencia `0,01` según etapa: evidencia perfecta para que el contador
   defina el método (ADR-014).
3. **NC elegible para retención**: la lista de facturas elegibles incluye `001-00004`
   (ADR-033: excluir NC/ND, solo facturas).
4. **`settlement_event` vs filtro `payment`** en bitácora: deuda menor de etiquetas.
5. Limpieza: sin `DIRECT_URL` como fallback el comando no corre en este entorno;
   la transacción abortada hace `ROLLBACK` sin borrar nada (verificado en la corrida).
