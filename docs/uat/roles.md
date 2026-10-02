# UAT por rol — guion y acta

> Registrar por corrida: rol, usuario, empresa, fecha, versión, casos, resultado, incidencias, firma.

## Administrativo
login → empresa → importar CSV → revisar errores → corregir/reimportar → confirmar → consultar documentos → descargar reporte. Verificar que emitir/cerrar/anular estén denegados (intentar y anotar el rechazo).

## Contador
login → revisar período (checklist) → validar cálculo y `explanation[]` → emitir → anular con motivo → sustituir → conciliar → congelar versión → cerrar → descargar libros. Verificar bloqueo con período cerrado y con G2 ambiguo (fail-closed).

## Auditor
login → período → drill-down total→documento→línea→origen → regla aplicada → comprobante → bitácora → exportar. Verificar solo-lectura (intentar mutar y anotar el rechazo).

## Administrador del sistema
usuarios → empresas → roles → sesiones → `/api/health` → logs (sin PII).

| Fecha | Rol | Usuario | Empresa | Versión | Casos OK/total | Incidencias | Firma |
|---|---|---|---|---|---|---|---|
| | | | | | / | | |
