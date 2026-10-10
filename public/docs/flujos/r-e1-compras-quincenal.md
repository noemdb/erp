# R-E1 · Libro de Compras quincenal

Abre `r-e1-compras-quincenal.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — eliges quincena y revisas, enero 2026.
- **Quincena** — Q1 `[01 → 16)` o Q2 `[16 → 01 del mes siguiente)`, tipo quincenal.
- **Tus compras** — facturas más NC con afectado; la fecha fiscal manda.
- **Libro de Compras** — totales por alícuota de la quincena.
- **Paquete de cierre** — manifiesto más sha256 de la quincena.

## Modos

- **Q1 (01 → 16)** — cargas y cierras la primera quincena.
- **Q2 (16 → fin)** — cargas y cierras la segunda. Cada historia de carga cambia sola a su modo.

## Historias

1. **Cargo Q1** — eliges Q1, registras con fecha fiscal dentro de Q1 y el libro suma la quincena.
2. **Cargo Q2** — igual para la segunda quincena.
3. **Cierro la quincena** — checklist verde, congelas el paquete y lo descargas; regenerar da el mismo hash.
