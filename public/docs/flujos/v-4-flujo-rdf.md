# V-4 · Flujo RDF

Abre `v-4-flujo-rdf.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — contador firmante.
- **Borrador** — hecho más alternativas A/B; el administrativo puede crearlo.
- **Revisión** — impacto numérico más cobertura; solo el contador aprueba.
- **Firma sha256** — nombre más documento más fecha; congela, no se edita.
- **Regla autorizada** — activa con cobertura; GATE_NO_RDF cede.

## Modos

- **Preparo (borrador y revisión)** — registras el hecho y envías a revisión.
- **Firmo (sha + reglas)** — apruebas, firmas y autorizas. Cada historia cambia sola a su modo.

## Historias

1. **Preparo el borrador** — hecho con A/B y cobertura prevista, a revisión.
2. **Firmo** — apruebas y firmas (sha congelado) y autorizas reglas con cobertura.
3. **Sustituyo** — si hay que corregir, nace una nueva que cita a la anterior.
