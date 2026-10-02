-- 2.0.5 §3.2: RLS + tenant_isolation en TODAS las operativas con company_id.
-- Excepción documentada (DATABASE.md): companies, users, company_user (join a membresía en app).
-- withholding_concepts admite company_id NULL (seed global): la política lo incluye.
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'attachments','audit_events','document_series','fiscal_holidays','fiscal_machines',
    'fiscal_obligations','generated_reports','import_batches','import_rows',
    'islr_withholding_lines','islr_withholdings','iva_withholding_lines','iva_withholdings',
    'purchase_document_lines','purchase_documents','received_links','sales_document_lines',
    'sales_documents','source_files','withholdings_received','z_reports'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR ALL TO PUBLIC USING (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::uuid) WITH CHECK (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON withholding_concepts;
--> statement-breakpoint
ALTER TABLE withholding_concepts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON withholding_concepts
  FOR ALL TO PUBLIC
  USING (company_id IS NULL OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id IS NULL OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
