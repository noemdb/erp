# R-E7 · XML de ISLR mensual Q1+Q2

> Proceso **diseñado, no construido**: requiere Q14 afirmativo más layout oficial
> del SENIAT (ver `blueprint/requerimiento/03-pendientes-cliente.md`).

Abre `r-e7-xml-mensual.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — contador, enero 2026.
- **Correlativos Q1+Q2** — ISLR emitidos en ambas quincenas, correlativos verificados.
- **Archivo XML** — un XML por mes; base parcial Q1 o total Q1+Q2 según el modo.
- **Validación** — contra esquema oficial, cero errores.
- **Paquete de cierre** — XML aceptado archivado con el mes.

## Modos

- **Q1 (01 → 16)** — cierras Q1 y juntas la base parcial.
- **Q2 (16 → fin)** — sumas Q2, generas el XML mensual y lo validas. Cada historia cambia sola a su modo.

## Historias

1. **Junto Q1** — cierras Q1 verificado y juntas la base parcial.
2. **Agrego Q2** — sumas Q1+Q2 (ejemplo: 20,00 + 35,00 = 55,00), generas y validas.
3. **Archivo mensual** — archivas el aceptado en el paquete y lo declaras en el portal.
