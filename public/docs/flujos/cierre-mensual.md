# Cierre mensual · Ordinario

Abre `cierre-mensual.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — cargas y cierras, enero 2026.
- **Documentos** — compras más ventas más pagos; la fecha fiscal manda.
- **Libros** — compras y ventas del mes, totales por alícuota.
- **Resumen** — cuota y cruce a cero, tolerancia 0,01.
- **Paquete** — manifiesto más sha256, 4 reportes más hash (solo en modo cerrado).
- **Período cerrado** — checklist verde más hash, inmutable.

## Modos

- **Abierto (en curso)** — cargas, sumas y concilias.
- **Cerrado (hash)** — congelas el paquete y cierras con hash. La historia de cierre cambia sola a este modo.

## Historias

1. **Cargo y libros** — anotas con fecha fiscal y los libros suman el mes.
2. **Resumen y concilio** — consolidas la cuota y cruzas las tres fuentes hasta cero.
3. **Congelo y cierro** — congelas el manifiesto y cierras enero: inmutable salvo reapertura con motivo.
