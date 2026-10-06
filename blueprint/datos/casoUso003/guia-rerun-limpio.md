# Rerun limpio — casoUso003 v2 (septiembre-2025)

Empresa Demo: `http://localhost:3000/c/a1f8bba4-f088-4a71-942a-2fad94820cf0`
(abrevio como `BASE` en las rutas; antepón siempre el dominio de tu entorno).

Archivo: `compras-septiembre-2025-rerun.csv` (idéntico al original salvo año `2023→2025`).
El año es el único cambio y es intencional: la regla seed IVA 75% rige `[2025-01-01,)` y los
períodos fiscales se auto-crean a partir de la `fecha_fiscal`; con fechas 2023 el preview
muere en `No hay regla de retención vigente`. Todo lo demás se conserva para re-demostrar
cada comportamiento: header con `aliquota_iva` (alias tolerado), `fecha_recepcion`
(ignorada), fila NC (rechazo esperado), fila con abono `1500.00` (aviso G2), filas
`160.05/320.10` (cuadran `base+iva=total`, así que NO generan divergencia: el validador
solo chequea esa suma, no `base×alícuota`).

## 0. Precondiciones y limpieza (terminal, rol migrador)

Por qué importa el orden: cada bloqueo de la corrida 1 se descubrió a golpes (regla sin
vigencia, perfiles en `false`, agente desactivado). Esta fase deja la empresa como antes
de la primera simulación.

1. Exporta la evidencia de la corrida anterior si aún no lo hiciste: abre
   `BASE/auditoria`, filtra por `Tipo = Lote` y por `Tipo = Compra`, y pulsa
   `Exportar CSV` en cada filtro. Guárdalos fuera del repo.
2. Carga el entorno y ejecuta la limpieza (borra documentos, terceros, eventos, staging,
   períodos de la sim, bitácora de la empresa y restaura `agente_retencion_iva=false`):
   ```bash
   set -a; source .env; set +a
   npm run sim:limpieza-caso003
   ```
   El script usa `DATABASE_MIGRATION_URL` o `DIRECT_URL` (rol migrador/owner, nunca el
   de la app), imprime el diagnóstico antes de borrar y la verificación `todo-0` al
   final. Solo escribe `COMMIT` si todo da 0; si algo no cuadra, `ROLLBACK` y avisa.
3. Verifica en UI que la empresa quedó vacía: `BASE/compras` debe decir
   `Aún no hay compras registradas`, `BASE/terceros` en 0 y `BASE/auditoria` en 0 eventos.
4. Roles listos: María `maria@practica.local` (intake), Carlos `carlos@practica.local`
   (perfiles, eventos, previews), Vargas `vargas@practica.local` (bitácora). Si falta
   alguno: `PRACTICA_PASSWORD=<clave> npm run seed:practica`.
5. No crear reglas retroactivas ni tocar `withholding_rules`/conceptos: la regla IVA 75%
   global ya cubre septiembre-2025 y es suficiente para el preview.

## 1. María — intake (sesión como María, `maria@practica.local`)

Ruta en UI: Panel → **Importaciones** → **Nueva importación**
(`BASE/importaciones/nueva`).

1. Rellena `Tipo = Compras`, `Sistema origen = Legacy`, adjunta
   `compras-septiembre-2025-rerun.csv` y pulsa `Subir`. El sistema guarda el archivo
   íntegro (`source_files` + `sha256`) y crea el lote en estado `Subido`. Si re-subes el
   mismo archivo, la idempotencia por `sha256` te devuelve el lote existente en vez de
   duplicarlo: eso es normal, no un error.
2. Dentro del lote (`BASE/importaciones/[batchId]`) pulsa `Validar filas`. El motor
   clasifica cada fila y el lote pasa a `Validado`. Resultado esperado, y por qué:
   `Total 10 | Válidas 0 | Advertencias 9 | Rechazadas 1`. Las 9 advertencias son
   `tercero nuevo` (base limpia: ningún RIF existe aún) más el aviso de la fila 5;
   la única rechazada es la fila 9 (`tipo_doc 'NC' no soportado…`: toda NC/ND exige
   `documento_afectado_id`, así que el importador la rechaza en vez de crear una
   factura común). Las filas 3 y 4 (`160.05/320.10`) NO avisan porque cuadran.
3. Lee el banner `Columnas no consumidas: aliquota_iva (…se deriva iva/base…);
   fecha_recepcion (…la fecha fiscal sale de fecha_documento…)`. Son columnas
   informativas: nada fiscal se ignora en silencio, pero tampoco alimentan el cálculo.
4. Pulsa `Descargar rechazadas` y archiva el CSV (es la evidencia de por qué el lote
   quedará `Parcial`). Si quieres mostrar el estado `Validado` en una demo, detente
   aquí; si no, pulsa `Confirmar (importar válidas)`: solo entran válidas+advertencias
   (9 documentos con trazabilidad archivo+fila+lote) y el lote queda `Parcial`.

## 2. NC manual (María o Carlos; permiso `docs.create`)

Ruta: Panel → **Compras** → **Nueva compra** (`BASE/compras/nueva`).
La fila 9 no entró al lote, así que se registra a mano. Este fue el punto donde la
corrida 1 falló (se registró ND con fecha 2026): copia los valores exactos.

1. `Proveedor → Buscar en registrados`: elige `J-12345678-9 / INSUMOS CARACAS C.A.`
   (ya creado al confirmar el lote).
2. `Tipo: Nota de crédito`. `N° factura: 001-00004`. `N° control: 12348`.
3. `Fecha documento: 2025-09-10`. `Fecha recepción: 2025-09-11`.
   `Fecha fiscal: 2025-09-10` (esta fecha —no la de registro— determina el período
   septiembre-2025; con otro año el documento caería en otro período).
4. `Documento afectado`: elige `001-00001` (obligatorio para NC; sin él obtendrás
   `MISSING_AFFECTED_DOCUMENT`, y si excede su saldo, `CREDIT_NOTE_EXCEEDS_BALANCE`).
5. Una línea `Gravada general`, `Alícuota 16`, `Base 100.00`, `IVA 16.00`,
   `Total documento 116.00`. Espera el badge verde `Cuadra Inv.1`; sin cuadre el botón
   se bloquea (`TOTAL_MISMATCH`).
6. `Guardar compra` (redirige a `BASE/compras`). Verifica el detalle: debe decir
   `Nota de crédito · 10-09-2025 · Ver afectada`. Estado final: 9 facturas + 1 NC.

## 3. Evento G2 + asignación (sesión como Carlos)

Ruta: Panel → **Pagos** → **Registrar evento** (`BASE/pagos/nuevo`).
El CSV trae `abono_en_cuenta 1500.00` pero no dice si fue pago o abono contable, ni
fecha efectiva ni método: el sistema no infiere nada, así que esos datos se declaran
explícitamente y quedan auditados. Para la simulación se registra como pago (único
camino emisible con el criterio `unset`).

1. `RIF beneficiario: J-11122233-4` (debe decir `Tercero encontrado y activo`).
2. `Tipo de evento: Pago`. `Fecha del evento: 2025-09-06` (= `fecha_recepcion` del CSV;
   cae en septiembre-2025). `Monto: 1500.00`. `Método: Sin especificar` (no inventes
   `Transferencia` sin soporte). `Referencia: CSV fila 5 / 004-00099 /
   abono_en_cuenta 1500.00 (simulación)`. No marques `Dato inferido` (el monto tiene
   soporte CSV y el tipo queda declarado en la referencia).
3. `Guardar evento` → abre su detalle (`BASE/pagos/[id]`).
4. Abajo, `Asignar a compra`: elige `004-00099 · total 3480.00`, escribe `1500.00` y
   confirma. Estado esperado: `Monto 1.500,00 / Asignado 1.500,00 / Disponible 0,00`
   y `Asignaciones (1)`. Registrar o asignar NO emite retención: solo habilita el
   preview ISLR bajo el criterio G2.

## 4. Activaciones (Carlos o admin, en este orden exacto)

1. Empresa → **Configuración** (`BASE/configuracion`): activa `agente de retención IVA`.
   Sin esto, `BASE/retenciones/nueva` muestra `…aún no es agente de retención IVA…`
   y no hay nada que previsualizar. Queda auditado como cambio de configuración.
2. **Terceros** (`BASE/terceros`): abre cada uno de los 6 proveedores y en su perfil
   fiscal marca `sujeto de retención IVA = sí` (jurídica, residente) con vigencia que
   cubra septiembre-2025. Sin esto, el preview responde `no es sujeto de retención`
   (el valor por defecto es `false` y la vigencia se evalúa contra la fecha fiscal del
   documento, no contra la fecha de emisión).

## 5. Previews de Carlos (solo preview: ver, anotar, NO emitir)

* **IVA** (`BASE/retenciones/nueva`): pon `Fecha de emisión: 2025-09-30` (determina
  regla vigente y período; la fecha de hoy sacaría el comprobante de septiembre),
  marca las 9 facturas y **desmarca `001-00004`** (la NC aparece como elegible por un
  hueco conocido —ADR-033— y jamás debe retenerse). Pulsa `Previsualizar cálculo`.
  Esperado: `75% × 1.572,15` de IVA (anota el total que muestra), `ruleVersionId` y
  `explanation[]` por línea (`IVA causado × 75.00%`). Detente aquí: emitir está
  bloqueado por gates F0 (matriz/dorados sin firma) y la deuda del signo NC.
* **ISLR** (`BASE/retenciones-islr/nueva`): elige el evento asignado del paso 3, el
  concepto que indique contabilidad, informa `Base sujeta` (el motor la reutiliza en
  ambos escenarios para comparar; no atribuye base por porción ni decide sustraendo
  parcial) y `Fecha emisión` dentro de septiembre-2025. Pulsa `Comparar criterios`
  y anota ambos escenarios. Con criterio `unset` y pago asignado convergente el
  preview pasa; un abono seguiría bloqueado hasta criterio explícito del contador
  (que exige motivo auditado y no equivale a aprobación fiscal). Tampoco se emite.

## 6. Cierre de María + archivo (Vargas o María; `audit.read`)

1. `BASE/auditoria?entityType=import_batch&entityId=[batchId]` → `upload` + `confirm
   (after:{created:9})`. Exporta el CSV.
2. `BASE/auditoria?entityType=purchase_document&action=create` → 9 creates de
   importación + 1 de la NC. Exporta el CSV.
3. Timeline por documento (`?entityType=purchase_document&entityId=[id]`): `001-00001`
   muestra `origen lote … · fila 1` (respuesta a “¿de dónde salió?” en ≤3 clics); la
   NC muestra `registro manual sin lote`.
4. Checklist 6/6: lote `Parcial` entendido · `rejected.csv` archivado · NC correcta
   contra afectado · evento G2 asignado · columnas ignoradas entendidas · compras
   (9+1), terceros (6) y bitácora verificables.

## Qué NO hacer (errores de la corrida 1)

Registrar la NC como factura o ND; mezclar años (2023/2026) o usar la fecha de hoy en
emisiones de prueba; afirmar un método de pago sin soporte; marcar la NC en el preview
IVA; emitir comprobantes o cerrar el período (provisional hasta ADR-033 + matriz y
dorados firmados); borrar `withholding_rules`, conceptos, usuarios o membresías en la
limpieza.
