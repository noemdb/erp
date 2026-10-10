# V-5 · Activar reglas

Abre `v-5-activar-reglas.html` en tu navegador. Todo está en español y se lee de izquierda a derecha.

## Lo que ves

- **Tú** — contador, por empresa.
- **Regla borrador** — porcentaje más vigencia más fuente, no solapa vigente.
- **Decisión firmada** — mismo impuesto y concepto, rol autoriza o aclara.
- **Gate GATE_NO_RDF** — rechaza sin cobertura, cede con cobertura; fail-closed.
- **Regla activa** — cierra vigencia anterior, historia intacta.

## Modos

- **Sin cobertura (rechaza)** — intentas activar y el gate responde denegado.
- **Con cobertura (activa)** — el gate cede y activas. Cada historia cambia sola a su modo.

## Historias

1. **Vinculo** — creas el borrador sin solapes y lo vinculas a su firmada.
2. **Sin cobertura** — intentas sin vínculo, el gate rechaza y vuelves a vincular.
3. **Activo** — con cobertura el gate cede; activas y cierras la vigencia anterior.
