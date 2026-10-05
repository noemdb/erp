# T07 — IMP-02/03/04 G2 + IVA consume eventos ⛔ (tras RDF G2)

- **Entrada:** RDF G2-a/b/c/d (qué asiento es abono, base por porción, sustraendo parcial, anticipos).
- **Hacer:** aplicar criterio configurado, sustraendo parcial PNR, IVA consume `settlement_events`; mantener fail-closed (`unset` salvo convergencia) hasta firma.
- **Aceptación:** preview dual converge en casos firmados + `g2:divergence` limpio + ABONO-01…03 verdes.
