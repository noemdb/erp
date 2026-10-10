# R-E6 · Comprobante de ISLR quincenal

Abre `r-e6-comprobante-islr.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — contador, quincena en curso.
- **Evento pago/abono** — fecha efectiva más asignación, de la quincena.
- **Preview dual** — pago contra abono, base y monto; solo se emite si convergen.
- **Comprobante emitido** — concepto más base por porcentaje menos sustraendo; serie provisional por quincena.
- **Entrega al proveedor** — fecha de entrega registrada.

## Modos

- **Q1 (01 → 16)** — registras el evento y comparas escenarios.
- **Q2 (16 → fin)** — emites y entregas. Cada historia cambia sola a su modo.

## Historias

1. **Evento en Q1** — registras pago o abono con fecha efectiva y asignación; comparas ambos escenarios.
2. **Emito en Q2** — emites si converge (fórmula con sustraendo, serie provisional) y queda inmutable.
3. **Entrego** — registras la entrega al beneficiario y cierras el ciclo.
