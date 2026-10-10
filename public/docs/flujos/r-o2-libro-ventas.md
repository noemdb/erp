# R-O2 · Libro de Ventas mensual

Abre `r-o2-libro-ventas.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — eliges enero 2026 y tu sucursal.
- **Período mensual** — enero `[01 → 02)`, tipo mensual.
- **Tus ventas** — factura una a una o Z con rango desde-hasta, según sucursal y sin mezclar en el mes.
- **Libro de Ventas** — débito por alícuota; cada total lleva a su papel.
- **Paquete de cierre** — manifiesto más sha256 de 6 secciones.

## Modos

- **Por factura (una a una)** — anotas cada venta individual.
- **Por Z (resumen del día)** — anotas el Z con su rango; los saltos se avisan. Cada historia cambia sola a su modo.

## Historias

1. **Vendo por factura** — eliges enero y sucursal, registras una a una y el libro suma el débito.
2. **Cargo mi Z** — eliges mes y máquina, anotas el Z con su rango y los saltos quedan avisados.
3. **Cierro el mes** — congelas el paquete (manifiesto más sha256) y lo descargas.
