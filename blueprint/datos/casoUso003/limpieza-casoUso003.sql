-- Limpieza casoUso003 — Empresa Demo a1f8bba4-f088-4a71-942a-2fad94820cf0
-- Ejecutar con ROL MIGRADOR/OWNER (DATABASE_MIGRATION_URL o DIRECT_URL; ver drizzle.config.ts), NO con el rol app:
--   set -a; source .env; set +a && npm run sim:limpieza-caso003
-- Por qué migrador: audit_events tiene REVOKE UPDATE/DELETE al rol app + RLS en operativas.
-- Alcance: SOLO company_id indicado. Usuarios, membresías, reglas globales y conceptos NO se tocan.
-- La bitácora se borra (es dev): si quieres evidencia, exporta /auditoria a CSV antes.

-- La variable :company llega por -v del comando npm (sin \set: el valor ya viene citado con :'company').

-- 0) Diagnóstico (solo lectura): anota las cifras y compáralas al final.
SELECT 'purchase_documents' t, status, count(*) FROM purchase_documents WHERE company_id = :'company' GROUP BY status;
SELECT 'parties' t, count(*) FROM parties WHERE company_id = :'company';
SELECT 'payments' t, count(*) FROM payments WHERE company_id = :'company';
SELECT 'import_batches' t, status, count(*) FROM import_batches WHERE company_id = :'company' GROUP BY status;
SELECT 'audit_events' t, count(*) FROM audit_events WHERE company_id = :'company';
SELECT 'fiscal_periods' t, status, range::text, count(*) FROM fiscal_periods WHERE company_id = :'company' GROUP BY status, range::text;
SELECT 'withholding_rules_empresa' t, count(*) FROM withholding_rules WHERE company_scope_key = :'company'; -- esperado 0; si >0, revisar antes de borrar

BEGIN;

-- 1) Liquidación G2 (hijas primero; payment_allocations.company_id existe: borrado directo)
DELETE FROM payment_allocations WHERE company_id = :'company';
DELETE FROM payments WHERE company_id = :'company';

-- 2) Retenciones (emitidas o no; en esta sim: 0, pero deja el rerun idempotente)
DELETE FROM iva_withholding_lines WHERE company_id = :'company';
DELETE FROM iva_withholdings WHERE company_id = :'company';
DELETE FROM islr_withholding_lines WHERE company_id = :'company';
DELETE FROM islr_withholdings WHERE company_id = :'company';
DELETE FROM received_links WHERE company_id = :'company';
DELETE FROM withholdings_received WHERE company_id = :'company';

-- 3) Documentos fiscales
DELETE FROM purchase_document_lines WHERE document_id IN (SELECT id FROM purchase_documents WHERE company_id = :'company');
DELETE FROM purchase_documents WHERE company_id = :'company';
DELETE FROM sales_document_lines WHERE document_id IN (SELECT id FROM sales_documents WHERE company_id = :'company');
DELETE FROM sales_documents WHERE company_id = :'company';
DELETE FROM z_reports WHERE company_id = :'company';
DELETE FROM fiscal_machines WHERE company_id = :'company';

-- 4) Staging (filas → lotes → archivos; el sha256 liberado permite re-subir el mismo CSV)
DELETE FROM import_rows WHERE company_id = :'company';
DELETE FROM import_batches WHERE company_id = :'company';
DELETE FROM source_files WHERE company_id = :'company';

-- 5) Reportes, series, adjuntos de la empresa
DELETE FROM generated_reports WHERE company_id = :'company';
DELETE FROM document_series WHERE company_id = :'company';
DELETE FROM attachments WHERE company_id = :'company';

-- 6) Períodos auto-creados por la sim (solo estos rangos; si otro flujo los usa, aborta aquí)
DELETE FROM fiscal_periods WHERE company_id = :'company' AND kind = 'monthly'
  AND range::text IN ('[2023-09-01,2023-10-01)', '[2026-09-01,2026-10-01)', '[2026-10-01,2026-11-01)', '[2025-09-01,2025-10-01)');

-- 7) Terceros y perfiles (creados por importación/registro manual)
DELETE FROM party_tax_profiles WHERE company_id = :'company';
DELETE FROM parties WHERE company_id = :'company';

-- 8) Bitácora (append-only: solo rol migrador puede; es el punto sin retorno)
DELETE FROM audit_events WHERE company_id = :'company';

-- 9) Config empresa a valores pre-sim (agente IVA se activó durante la sim)
UPDATE companies SET agente_retencion_iva = false, abono_criterion = 'unset', updated_at = now()
WHERE id = :'company';

-- 10) Verificación: todo debe dar 0 (excepto companies = 1 y reglas globales intactas)
SELECT 'purchase_documents' t, count(*) FROM purchase_documents WHERE company_id = :'company'
UNION ALL SELECT 'parties', count(*) FROM parties WHERE company_id = :'company'
UNION ALL SELECT 'payments', count(*) FROM payments WHERE company_id = :'company'
UNION ALL SELECT 'import_batches', count(*) FROM import_batches WHERE company_id = :'company'
UNION ALL SELECT 'source_files', count(*) FROM source_files WHERE company_id = :'company'
UNION ALL SELECT 'audit_events', count(*) FROM audit_events WHERE company_id = :'company'
UNION ALL SELECT 'fiscal_periods', count(*) FROM fiscal_periods WHERE company_id = :'company'
UNION ALL SELECT 'iva_withholdings', count(*) FROM iva_withholdings WHERE company_id = :'company'
UNION ALL SELECT 'generated_reports', count(*) FROM generated_reports WHERE company_id = :'company';
SELECT id, rif_original, agente_retencion_iva, abono_criterion FROM companies WHERE id = :'company';

-- Si todo es 0: COMMIT; si algo no cuadra: ROLLBACK.
COMMIT;
-- NOTA: el ledger de emisiones (emissions.jsonl) no se toca: en esta sim no se emitió nada.
