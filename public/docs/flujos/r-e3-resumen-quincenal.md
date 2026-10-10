# R-E3 · Resumen de IVA quincenal

Abre `r-e3-resumen-quincenal.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — revisas y congelas, enero 2026.
- **Resumen de IVA** — cuota Q1 o Q2 según el modo.
- **Bloques de la quincena** — ventas, compras, retenciones y excedente, Q1 y Q2 por separado.
- **Conciliación** — libros contra resumen contra comprobantes, tolerancia 0,01.
- **Versión congelada** — snapshot más sha256, una por quincena.

## Modos

- **Q1 (01 → 16)** — revisas la cuota de la primera quincena.
- **Q2 (16 → fin)** — revisas con el excedente arrastrado de Q1. Cada historia cambia sola a su modo.

## Historias

1. **Reviso Q1** — abres Q1, sumas excedente y recibidas sin neteo y confirmas; el excedente viaja a Q2.
2. **Reviso Q2** — abres con el arrastre de Q1, concilias las tres fuentes y dejas en cero.
3. **Congelo la quincena** — pides congelar, queda fija y cierras tranquilo.
