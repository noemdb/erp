CREATE TABLE IF NOT EXISTS "generated_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"fiscal_period_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"format" text NOT NULL,
	"data_snapshot" jsonb NOT NULL,
	"sha256" text NOT NULL,
	"storage_path" text NOT NULL,
	"generated_by" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_reports" UNIQUE("company_id","fiscal_period_id","kind","version","format")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
