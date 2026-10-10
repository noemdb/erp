# R-O1 · Libro de Compras mensual

Abre `r-o1-libro-compras.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — eliges enero 2026 y revisas.
- **Período mensual** — enero `[01 → 02)`, tipo mensual.
- **Tus compras** — facturas más NC con documento afectado; la fecha fiscal manda.
- **Libro de Compras** — totales por alícuota; cada total lleva a su papel. En modo cierre aparece congelado.
- **Paquete de cierre** — manifiesto más sha256 de 6 secciones (solo visible en modo cierre).

## Modos

- **Mes abierto (carga)** — anotas y el libro suma.
- **Mes cerrado (cierre)** — congelas el paquete y lo descargas. El flujo de cierre cambia solo a este modo.

## Historias

1. **Cargo el mes** — eliges enero, registras con fecha fiscal y el libro suma por alícuota.
2. **Corrijo con NC** — registras la NC con su documento afectado y el libro ajusta y cuadra.
3. **Cierro el mes** — congelas el paquete (manifiesto más sha256) y lo descargas; regenerar da el mismo hash.
