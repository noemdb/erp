# Hoja de firma — G9 + matriz ISLR (R-E6)

> **Estado:** propuesta para firma, no aprobada · **Actualizado:** 2026-10-09
> **Dueño de firma:** contador del cliente (con cliente para G9-B).
> Los valores marcados *(propuesto)* vienen de asesoría/fuentes secundarias para
> cotejar contra Gaceta Oficial y portal fiscal — **no son reglas activas**.
> Al firmar, cada fila entra como RDF (`draft→in_review→approved→signed`) y solo
> entonces su regla se activa (`GATE_NO_RDF`). Ver `pedido-F0-01.md` B-1…B-10,
> `matriz-reglas-v1.md` ISLR-CONCEPTO/ISLR-MOMENTO.

## Decisión G9 — Formato y serie ISLR

| Opción | Descripción | Respuesta (marcar una) |
|---|---|---|
| **A** | Adoptar la serie actual `ISLR-AAAAMM-######` como formato **permanente** (sin migración; lo emitido en piloto queda válido) | ☐ APROBADO |
| **B** | Otro formato (anexar ejemplo anonimizado + política de reinicio y convivencia con la serie provisional) | ☐ APROBADO (ver anexo) |

Firmante: ______________________ Fecha: __________ Firma: __________

## Matriz ISLR por concepto (base B-1…B-8)

Completar una fila por concepto que la empresa pague. Base/sustraendo/UT según
texto vigente cotejado; lo *(propuesto)* es punto de partida, no valor final.

| Concepto (código) | % *(propuesto)* | Base | Sustraendo en parciales | Sujeto | Respuesta |
|---|---|---|---|---|---|
| Honorarios profesionales (HON) | 2% sin sustraendo | ☐ sin IVA / ☐ total facturado | ☐ en cada pago / ☐ una vez por factura | ☐ PJ / ☐ PN / ☐ NR | ☐ APROBADO / ☐ MODIFICAR: ____ |
| Comisiones | *(a cotejar)* | ☐ sin IVA / ☐ total facturado | ☐ en cada pago / ☐ una vez por factura | ☐ PJ / ☐ PN / ☐ NR | ☐ APROBADO / ☐ MODIFICAR: ____ |
| Alquileres | *(a cotejar)* | ☐ sin IVA / ☐ total facturado | ☐ en cada pago / ☐ una vez por factura | ☐ PJ / ☐ PN / ☐ NR | ☐ APROBADO / ☐ MODIFICAR: ____ |
| _(agregar filas)_ | | | | | |

## Parámetros transversales

| # | Pregunta | Respuesta |
|---|---|---|
| B-3 | Base de ISLR: ¿sin IVA o total facturado? | ☐ A sin IVA · ☐ B total facturado |
| B-4 | Sustraendo en pagos parciales PN | ☐ A en cada pago · ☐ B una vez por factura |
| B-5 | UT aplicable | ☐ A vigente a fecha de retención · ☐ B otra: ____ (valor: ____) |
| B-6 | Mínimos de PJD (art. 9 §2) | ☐ A sin mínimo · ☐ B mínimo en U.T.: ____ |
| B-8 | ¿Paga a no residentes/no domiciliados? | ☐ Sí (anexar regla) · ☐ No |
| G2 | Criterio pago/abono de la empresa | ☐ `payment_only` · ☐ `account_credit_or_payment` (ver `decision-abonos-G2-contador.md`) + motivo: ____ |

Firmante: ______________________ Fecha: __________ Firma: __________

## Efecto de la firma

1. Cada fila APROBADA genera su RDF firmado (firma congela `content_sha256`).
2. Con G9=A no hay migración de serie; con G9=B se planifica convivencia antes de emitir.
3. Las reglas se versionan por vigencia y se activan contra su RDF (`GATE_NO_RDF`).
4. R-E6 pasa de serie provisional a comprobante con validez firmada.
