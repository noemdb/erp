-- F1-3: RLS defensa en profundidad (DATABASE.md + SECURITY.md).
-- Activa en operativas con company_id. Excepción: users, companies, company_user
-- (acceso controlado por join a membresía en app). El rol owner (Neon) bypassa
-- RLS: la aplicación hace cumplir con withTenant + authorize + tests de fuga;
-- un rol app sin owner/BYPASSRLS queda como hardening F7 (ver ADR-015).
--> statement-breakpoint
ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "branches";
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "branches"
  FOR ALL TO PUBLIC
  USING ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "parties" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "parties";
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "parties"
  FOR ALL TO PUBLIC
  USING ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "party_tax_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "party_tax_profiles";
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "party_tax_profiles"
  FOR ALL TO PUBLIC
  USING ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "fiscal_periods" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "fiscal_periods";
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "fiscal_periods"
  FOR ALL TO PUBLIC
  USING ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid);
