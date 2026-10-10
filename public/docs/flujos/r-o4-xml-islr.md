# R-O4 · XML de ISLR mensual

> Proceso **diseñado, no construido**: requiere Q14 afirmativo más layout oficial
> del SENIAT (ver `blueprint/requerimiento/03-pendientes-cliente.md`).

Abre `r-o4-xml-islr.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — contador, enero 2026.
- **Comprobantes del mes** — ISLR emitidos en enero, correlativo del mes.
- **Archivo XML** — un archivo por mes (`enero.xml`).
- **Validación** — contra esquema oficial, cero errores.
- **Paquete de cierre** — XML aceptado archivado con el mes.

## Modos

- **Preparo (junto el mes)** — emites comprobantes y juntas la base.
- **Declaro (genero y archivo)** — generas, validas y archivas. La historia de archivo cambia sola a este modo.

## Historias

1. **Junto el mes** — emites los ISLR de enero y juntas la base (ejemplo: 55,00 = correlativo).
2. **Genero y valido** — generas el XML y lo validas: cero errores o se corrige y regenera.
3. **Archivo y declaro** — archivas el aceptado en el paquete y lo presentas en el portal.
