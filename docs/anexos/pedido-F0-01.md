# Pedido F0-01 al contador/cliente — envío 2026-10-05

> Carátula del envío F0-01 (límite Enmienda E-4: lun 05-oct). Reúne en un solo
> pedido lo que la guía `pendientes/TERCERA_REV/guia/02-ruta-externa.md` Paso 1
> exige. Documentos base en este mismo `docs/anexos/`. Responder cada punto
> APROBADO / MODIFICAR / PENDIENTE con fecha. Nada de lo pedido sustituye la
> firma de la matriz v1 ni de los dorados.

## A. Documentos adjuntos (ya en `docs/anexos/`)

| # | Documento | Uso |
|---|---|---|
| 1 | `paquete-contador.md` | Qué necesitamos, con respuestas parciales 01-oct |
| 2 | `matriz-reglas-v1.md` (borrador) + `checklist-F0.md` | Revisar, no firmar aún |
| 3 | `cotejo-gaceta-F0.md` | SNAT/2025/000054, Decreto 1.808 y UT 43 verificados en fuentes múltiples; artículo por artículo pendiente de ejemplar oficial |
| 4 | `decision-abonos-G2-contador.md` | Hoja de 4 decisiones G2 para Sesión 1 |
| 5 | `roles-piloto-form.md` | Una página por empresa piloto (ver §D) |

## B. Cuestionario consolidado — 18 preguntas (fuente: asesoría F0 §9)

| # | Pregunta | Opciones | Bloquea | Respuesta |
|---|---|---|---|---|
| 1 | ¿Contabilidad por causación o caja? | A causación · B caja · C mixta | G2 | |
| 2 | ¿La fecha de registro del legacy equivale al abono en cuenta? | Sí · No · Depende | G2 | |
| 3 | ¿Base de ISLR sin IVA o con IVA? | A sin IVA · B total facturado | F2 | |
| 4 | Sustraendo en pagos parciales PNR | A en cada pago · B una vez por factura | F4 | |
| 5 | UT aplicable a la retención | A vigente a fecha de retención · B otra | F4 | |
| 6 | Mínimos de PJD (art. 9 §2) | A sin mínimo · B mínimo en U.T. | F4 | |
| 7 | Conceptos ISLR que paga la empresa | Checklist asesoría §2.2 | F4 | |
| 8 | ¿Paga a no residentes/no domiciliados? | Sí/No | Alcance v1 | |
| 9 | Secuencial IVA: ¿se reinicia mensualmente? | A solo al desbordar · B mensual | F4 | |
| 10 | Formato de numeración ISLR | A como IVA · B otro (adjuntar ejemplo) | G9 | |
| 11 | ¿La empresa es sujeto pasivo especial/agente de IVA? | Sí/No (por empresa) | H1 | |
| 12 | ¿Quién emite y quién aprueba? | Matriz asesoría §4.2 | Permisos | |
| 13 | ¿Anulación después de enterada? | Ajuste en período corriente · otro | F4/F6 | |
| 14 | ¿Quieren exportar TXT/XML al Portal Fiscal en v1? | Sí/No | Alcance | |
| 15 | ¿IGTF aparece en sus facturas? ¿Cómo se registra? | — | Libros | |
| 16 | ¿La plantilla XLSX cumple los campos de asesoría §5.1? | Sí/No por campo | Formato | |
| 17 | Redondeo: método y etapa (tras "8 cifras significativas") | Por línea/documento/período | ADR-014 | |
| 18 | Fecha y tipo de tasa BCV, y diferencias cambiarias | — | ADR-013 | |

## C. Formato de reportes — 5 preguntas (fuente: ROADMAP-03 §3.7)

| # | Pregunta | Respuesta |
|---|---|---|
| F-1 | ¿Papel carta o A4? ¿Orientación y márgenes para libros? | |
| F-2 | ¿El libro se imprime, se firma o se folia, o se archiva en digital? | |
| F-3 | ¿Necesitan "vienen/pasan" (acumulados por página)? | |
| F-4 | Comprobante físico exige duplicado (art. 16): ¿se imprimen original y copia con marca "ORIGINAL"/"COPIA"? | |
| F-5 | ¿Se requiere archivo de preservación (PDF/A)? | |

## D. Ajustes post-cierre + piloto + tiempos

- **P-1 (post-cierre):** ¿los ajustes post-cierre se registran por reapertura del período con motivo auditado, o requieren tabla de ajustes separada? ¿Quién los autoriza?
- **P-2 (piloto):** elegir empresa piloto + completar `roles-piloto-form.md` (una página por empresa: prepara/revisa/aprueba/emite/anula/reemite).
- **P-3 (tiempos):** línea base de tiempos del proceso actual (preparar→revisar→emitir→entregar por mes) para calibrar M5/M6.
- **P-4 (sesión):** slot semanal fijo para sesiones + fecha de entrega de matriz y dorados.
- **P-5 (normas):** ejemplar oficial de las 3 normas (SNAT/2025/000054, Decreto 1.808, UT vigente).

## E. Muestras reales M-1…M-4 (límite 16-oct, anonimizables antes de entrar al sistema)

| # | Muestra | Aceptación |
|---|---|---|
| M-1 | Mes CSV legacy completo (compras+ventas+pagos) | Parseable por `import:autodetect`; ≥1 mes calendario |
| M-2 | Reportes Z reales por marca/sucursal | ≥1 Z por máquina con rango y salto documentado |
| M-3 | Libros del contador del mismo mes | Mismo período que M-1/M-2 |
| M-4 | XLSX sobre plantilla original | Abre con `exceljs`; inventario con `golden:inspect` sin copiar PII |

## Registro de envío

| Fecha | Medio/destinatario | Contenido | Responsable |
|---|---|---|---|
| 2026-10-05 | pendiente (anotar canal + acuse) | A+B+C+D+E | |
