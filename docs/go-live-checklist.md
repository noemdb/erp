# Go-live checklist (1.0.5 §5.7)

> Todo ☐ requiere evidencia enlazada. Sin 100% no hay producción fiscal.

## Fiscal
- [ ] Matriz firmada (`anexos/matriz-reglas-v1.md`)
- [ ] Dorados firmados 100% verdes (`acceptance/test-results/golden-results.json`)
- [ ] Reglas versionadas con vigencia
- [ ] G1–G12 cerradas o diferidas formalmente
- [ ] Piloto conciliado (M5: Excel vs sistema = 0 o aprobado)

## Datos
- [ ] Migración aprobada (`migration-report/` por empresa)
- [ ] Originales + sha256 preservados, trazabilidad completa

## Seguridad
- [ ] RBAC + fuga 0 (`fuga-matrix.test.ts`, suite CI)
- [ ] Rol `app_runtime` activo en staging/prod (`DB_LEAST_PRIVILEGE=true`)
- [ ] Secretos rotados (`runbooks/rotacion-secretos.md`)
- [ ] Headers (HSTS/nosniff/DENY) + logs sin PII verificados

## Continuidad
- [ ] Backup automático + externo + cifrado + PITR
- [ ] Restore drill con RPO/RTO medidos (`runbooks/restore.md`)

## Operación
- [ ] UAT 4 roles (`docs/uat/roles.md` firmado)
- [ ] Manuales + runbooks entregados y probados
- [ ] Health/storage/db/backup/monitoreo OK

## Acta
- [ ] `docs/acta-aceptacion.md` firmada por contador y cliente
