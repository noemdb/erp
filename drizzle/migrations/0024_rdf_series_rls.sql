-- 0024: RLS + tenant_isolation en rdf_series (omitida en 0023; la exige el invariante
-- de catálogo 2.0.5 §3.2 y el test catalog-invariant). Sin cambios de datos ni de API.
-- Rollback: DROP POLICY IF EXISTS tenant_isolation ON rdf_series; ALTER TABLE rdf_series DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rdf_series" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "rdf_series";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "rdf_series" FOR ALL TO PUBLIC USING ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid);
