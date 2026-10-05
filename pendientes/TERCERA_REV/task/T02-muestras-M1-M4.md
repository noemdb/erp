# T02 — Muestras M-1…M-4 🧪

- **Dueño:** cliente · **Límite:** 16-oct · **Pedidas:** F0-01 (2026-10-05).
- **Aceptación:** M-1 CSV legacy ≥1 mes parseable por `import:autodetect`; M-2 ≥1 Z por máquina con rango/salto; M-3 libros mismo período; M-4 XLSX abre con `exceljs` (`golden:inspect`, sin PII).
- **Gate de entrada:** `import:autodetect` + `golden:inspect` deciden si bastan o se devuelve el pedido (gatillo FUN-05). Intake verificado 05-oct (CHANGELOG).
- **Si falta:** corpus sintético marcado; M2 no corre (plan B guía 02).
- **Desbloquea:** T08, T09, T10.
