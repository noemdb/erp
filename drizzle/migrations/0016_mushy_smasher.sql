ALTER TABLE "companies" ADD COLUMN "sales_mode" text DEFAULT 'invoices' NOT NULL;--> statement-breakpoint
ALTER TABLE "fiscal_machines" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fiscal_machines" ADD CONSTRAINT "fiscal_machines_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "chk_companies_sales_mode" CHECK ("companies"."sales_mode" IN ('invoices', 'z'));