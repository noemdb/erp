CREATE TABLE IF NOT EXISTS "fiscal_machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"serial" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_machines_company_serial" UNIQUE("company_id","serial")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "z_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"machine_id" uuid NOT NULL,
	"fiscal_period_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"z_number" text NOT NULL,
	"range_from" text NOT NULL,
	"range_to" text NOT NULL,
	"ventas_gravadas" numeric(18, 2) NOT NULL,
	"ventas_exentas" numeric(18, 2) DEFAULT '0' NOT NULL,
	"iva" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total" numeric(18, 2) NOT NULL,
	"source_file_id" uuid,
	CONSTRAINT "uq_z_company_machine_number" UNIQUE("company_id","machine_id","z_number")
);
--> statement-breakpoint
ALTER TABLE "purchase_documents" ADD COLUMN "source_file_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_documents" ADD COLUMN "source_row_number" integer;--> statement-breakpoint
ALTER TABLE "purchase_documents" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_documents" ADD COLUMN "source_file_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_documents" ADD COLUMN "source_row_number" integer;--> statement-breakpoint
ALTER TABLE "sales_documents" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fiscal_machines" ADD CONSTRAINT "fiscal_machines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "z_reports" ADD CONSTRAINT "z_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "z_reports" ADD CONSTRAINT "z_reports_machine_id_fiscal_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."fiscal_machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "z_reports" ADD CONSTRAINT "z_reports_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchase_batch" ON "purchase_documents" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_batch" ON "sales_documents" USING btree ("import_batch_id");