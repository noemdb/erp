ALTER TABLE "payments" ADD COLUMN "event_type" text DEFAULT 'payment' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "source_ref" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "inferred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "chk_payments_event_type" CHECK ("event_type" IN ('payment', 'account_credit'));--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "chk_payments_positive_amount" CHECK ("monto" > 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "chk_payment_allocation_positive_amount" CHECK ("monto_asignado" > 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "payments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "payments"
  FOR ALL TO PUBLIC
  USING ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "payment_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "payment_allocations";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "payment_allocations"
  FOR ALL TO PUBLIC
  USING ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = NULLIF(current_setting('app.company_id', true), '')::uuid);