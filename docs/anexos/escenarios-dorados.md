# Anexo — Escenarios dorados (plantilla, 30–50 casos)

> Resueltos a mano por contador, versionados en `fixtures/tax-scenarios/*.json`. Gate F2: 100% verdes.

Formato por caso: `id, descripción, entradas (empresa/perfil/doc/asOf/reglas), esperado (base/IVA/retenido/explanation), regla aplicada`.

- [ ] Compra gravada general
- [ ] Compra exenta / sin crédito
- [ ] NC parcial a factura gravada+exenta
- [ ] Retención IVA 75% / 100%
- [ ] ISLR con sustraendo (resultado 0 si base*%−sustraendo <0)
- [ ] Pago parcial con retención
- [ ] Z vs factura individual
- [ ] Documento período anterior registrado tarde
