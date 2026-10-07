# SECURITY.md — ERP-TributarioLite

> Estado v0.1 (propuesta). Se refina en F1→F7. Fuente: `ARCHITECTURE.md` (auth, tenancy, env), `DATABASE.md` (RLS, sensibles), `API.md` (acciones), `ROADMAP §8` (matriz inicial, riesgos R4/R5).

## Gestión de secretos

- Solo variables de entorno. `.env` fuera del repo, `.env.example` sin valores reales, claves distintas por entorno. Ver variables en `ARCHITECTURE.md` (`DATABASE_URL` rol app, `DATABASE_MIGRATION_URL` rol migraciones, `AUTH_SECRET`, `FILE_SIGNING_SECRET`, `S3_*`, `SENTRY_DSN`, `BACKUP_*`).
- Rotación documentada en runbooks F7. Acceso a prod con MFA y mínimo privilegio.
- Checklist:
  - [ ] `.env` en `.gitignore`
  - [ ] `.env.example` existe sin secretos
  - [ ] `DATABASE_URL` ≠ `DATABASE_MIGRATION_URL`, sin owner ni `BYPASSRLS` para app
  - [ ] Rotación de `AUTH_SECRET` / `FILE_SIGNING_SECRET` probada

## Autenticación

- **Estrategia:** auth propio con sesiones en PostgreSQL (ADR-030; cierra la
  alternativa "Auth.js o Better Auth"), cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- **Expiración/revocación:** expiración por inactividad + absoluta, revocación por usuario (cierre sesión / disable). MFA recomendado Contador y Admin (alcance v1 pendiente).
- **Contraseñas:** Argon2id, mínimo 10 en restablecimiento, recuperación **solo asistida por admin** (ADR-025): token ≥256 bits (solo hash), un solo uso, TTL 60 min, invalida sesiones+tokens, auditoría por etapa. Break-glass por CLI en runbook.
- **Rate limiting auth:** login y reset con límite estricto + bloqueo progresivo. Ver abajo.

## Autorización — RBAC rol × empresa

Evaluada en una sola capa `authorize(ctx, action, resource)` + RLS como defensa en profundidad. `company_user(role)` determina alcance. Sin login proveedor v1 (`supplier` reservado).

| Acción (API) | Admin sist. | Administrativo | Contador | Auditor |
|---|---|---|---|---|
| Gestionar usuarios/empresas/sucursales | ✅ | — | — | — (lectura empresas asignadas) |
| Gestionar terceros / perfiles fiscales | — | ✅ | ✅ | lectura |
| Crear/editar documentos compra/venta/pagos (período abierto) | — | ✅ | ✅ | lectura |
| Importar CSV / confirmar lote | — | ✅ | ✅ | lectura |
| Editar `withholding_rules` / catálogos (solo contador, con log) | — | — | ✅ | lectura |
| RDF: preparar borrador / enviar a revisión | — | ✅ | ✅ | lectura |
| RDF: aprobar / firmar / vincular a regla (motivo + auditoría) | — | — | ✅ | lectura |
| Configurar criterio G2 por empresa (`abono_criterion`) con motivo/auditoría | — | — | ✅ | lectura |
| Previsualizar cálculo (`explanation[]`) | — | ✅ | ✅ | ✅ |
| Emitir/anular comprobantes IVA/ISLR (motivo obligatorio) | — | pendiente cliente* | ✅ | lectura |
| Cerrar / reabrir período (motivo + responsable) | — | — | ✅ | lectura |
| Ver reportes, drill-down, conciliación, bitácora | ✅ | ✅ propia empresa | ✅ | ✅ solo lectura |
| Descargar PDF/Excel/adjuntos (URL firmada HMAC+TTL, permiso revalidado) | ✅ | ✅ | ✅ | ✅ |
| Generar enlace de restablecimiento | ✅ (admin) | — | — | — |

`*` Decidir en F0: administrativo solo prepara vs emite. Por defecto solo contador emite.

Reglas: cambio de empresa activa reconstruye contexto, sin caché cross-tenant. Período `closed` bloquea mutación aunque el rol la tenga (doble capa app + trigger DB).

## Tenancy y base de datos

- Esquema compartido + `company_id` + RLS en todas las operativas (`branches`, `parties`, `fiscal_periods`, `purchase/sales_*`, eventos de liquidación (`payments`) y asignaciones (`payment_allocations`), `imports`, `withholdings`, `generated_reports`, `audit_events`, `attachments`). Excepción: `companies`, `users`, `company_user` (join a membresía).
- `withTenant(ctx, fn)`: TX + `SET LOCAL app.company_id/user_id`. `SET LOCAL` (no `SET`) por pooling.
- Rol app: no owner, `NO BYPASSRLS`. Migraciones con rol distinto. `REVOKE UPDATE, DELETE ON audit_events FROM app_role`.
- Suite fuga entre tenants obligatoria en CI por cada endpoint (lectura/escritura/exportación empresa A→B debe fallar). Severidad máxima.

## Validación de inputs

- Zod en **servidor** (autoridad), cliente solo conveniencia. Dinero string decimal (`decimal.js`), `numeric` como string desde driver. RIF con regex + preserva original/normalizado.
- Sanitización: XSS en render, nombres archivo, parámetros `period_key`, CSV injection al exportar (prefijar celdas `=+-@`), validación tipo upload por contenido no extensión, límite `MAX_UPLOAD_MB`, storage fuera webroot, descarga URL firmada ≤15 min.
- Constraints DB como última defensa: `UNIQUE` parcial duplicados, `EXCLUDE` vigencias, `CHECK` totales/estados, trigger período cerrado, `chk_retained_le_vat`.

## Rate limiting

| Grupo | Ventana sugerida | Al exceder |
|---|---|---|
| `login`, `resetPassword` | estricto (p.ej. 5/min/IP + bloqueo progresivo) | 429 `RATE_LIMITED` + alerta |
| `upload` / `validateBatch` / `confirmImport` | medio por usuario/empresa | 429 + job diferido |
| `issueWithholding`, `closePeriod` | estricto por empresa (evita doble emisión) + `Idempotency-Key` | 429, sin consumir número |
| `reports` export PDF/Excel | medio (reintento `render:retry`; cola diferida ADR-031) | 429 / reintentar |

Ajustar valores en F7 con pruebas. Todo 429 usa `RATE_LIMITED`.

## Logs, PII y retención

Sin PII/secretos en logs (pino + Sentry). Enmascara `email`, `rif`, `razon_social`, `direccion_fiscal`, tokens, hashes. `password_hash` Argon2id nunca en logs.

| Dato | Tratamiento | Retención |
|---|---|---|
| `users.password_hash/email` | hash / enmascarado | vida cuenta |
| `parties.rif/razón/dirección`, snapshots fiscales | RLS + enmascarado logs | empresa + 10 años fiscal |
| `source_files.content`, `attachments`, `data_snapshot`, `generated_reports` | storage cifrado reposo, backup cifrado | 10 años fiscal |
| `audit_events` | append-only, sin PII innecesaria | indefinido |

Backups: `pg_dump` diario + WAL (PITR), copia fuera del servidor cifrada, restore drill documentado. RPO ≤24h mín, ideal ≤1h. staging/dev sin datos reales sin anonimizar.

## Otros controles

- [ ] HTTPS + HSTS forzado, proxy TLS (Caddy/Nginx), `Secure` cookies
- [ ] Headers: CSP, HSTS, X-Frame-Options, nosniff. CORS explícito (no `*` prod). No hay API pública v1.
- [ ] Uploads fuera webroot, firma descargas corta vida
- [ ] Health `/api/health`, alertas jobs fallidos y backup no ejecutado
- [ ] Dependencias auditadas (`npm audit`), dos procesos sin Docker (app/worker)

## Amenazas y mitigación (resumen ROADMAP R4/R5/R9)

| Amenaza | Prob. | Mitigación |
|---|---|---|
| Fuga entre empresas | Baja / Crítica | `withTenant` + RLS + suite fuga CI + revisión pre-go-live |
| Duplicados/huecos numeración | Baja / Crítica | `UPDATE...RETURNING` en TX + test 50–100 paralelos |
| Reglas mal interpretadas | Media / Crítica | Matriz firmada, dorados, `explanation[]`, paralelo Excel |
| Pérdida datos / conectividad VE | Media / Alta | Backup externo cifrado + restore drill + deploy simple |
| CSV adversarial / inyección Excel | Alta / Media | Staging + validación + neutralización `=+-@` |
| Abuso auth/emisión | Media | Rate limit + MFA + idempotencia + audit |

---
Ver también: `README.md`, `API.md` (acciones), `ARCHITECTURE.md`, `DATABASE.md` (RLS), `TODO.md`, `CHANGELOG.md`.
