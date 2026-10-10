# R-E5 · Comprobante de IVA quincenal

Abre `r-e5-comprobante-iva.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — contador, quincena en curso.
- **Facturas elegibles** — validadas con IVA, no retenidas, de la quincena.
- **Preview justificado** — base, IVA, porcentaje y retenido por línea, antes de emitir.
- **Comprobante emitido** — número sin huecos más snapshot; serie según quincena.
- **Entrega al proveedor** — fecha de entrega registrada dentro del plazo.

## Modos

- **Q1 (01 → 16)** — armas el comprobante en la primera quincena.
- **Q2 (16 → fin)** — emites en la segunda. Cada historia cambia sola a su modo.

## Historias

1. **Armo en Q1** — eliges elegibles de Q1 y revisas el preview justificado.
2. **Emito en Q2** — el número se reserva en transacción (si falla, no se consume) y queda inmutable.
3. **Entrego** — registras la entrega dentro de los 2 días hábiles del período siguiente y cierras el ciclo.
