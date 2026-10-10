# V-3 · Matriz ISLR

Abre `v-3-matriz-islr.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — contador validador.
- **Hoja matriz** — fila por concepto, APROBADO o MODIFICAR.
- **Cotejo Gaceta** — propuesto contra vigente, fuente primaria.
- **Regla versionada** — porcentaje más base más sustraendo más vigencia, sin solapes.
- **RDF firmado** — la firma congela su sha256, uno por fila aprobada.

## Modos

- **Borrador (completo y cotejo)** — llenas la tabla y comparas con la fuente.
- **Firmada (activa reglas)** — firmas por fila y cada aprobada genera su RDF. Cada historia cambia sola a su modo.

## Historias

1. **Completo la tabla** — una fila por concepto que pagues y cotejo contra Gaceta.
2. **Firmo por fila** — marcas APROBADO o MODIFICAR, firmas y nace la regla versionada.
3. **Activo reglas** — verificas cobertura y activas; sin ella el sistema rechaza.
