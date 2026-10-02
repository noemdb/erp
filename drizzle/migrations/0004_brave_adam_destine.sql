CREATE TABLE IF NOT EXISTS "purchase_document_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"tax_category" text NOT NULL,
	"tax_rate" numeric(18, 6),
	"base" numeric(18, 2) NOT NULL,
	"iva" numeric(18, 2) DEFAULT '0' NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"fiscal_period_id" uuid NOT NULL,
	"kind" text DEFAULT 'invoice' NOT NULL,
	"party_id" uuid NOT NULL,
	"doc_number" text NOT NULL,
	"control_number" text NOT NULL,
	"affected_document_id" uuid,
	"fecha_documento" date NOT NULL,
	"fecha_recepcion" date,
	"fecha_fiscal" date NOT NULL,
	"base_imponible" numeric(18, 2) NOT NULL,
	"iva_causado" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'VES' NOT NULL,
	"status" text DEFAULT 'validated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_purchase_doc" UNIQUE("company_id","party_id","kind","doc_number","control_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_document_lines" ADD CONSTRAINT "purchase_document_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_document_lines" ADD CONSTRAINT "purchase_document_lines_document_id_purchase_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."purchase_documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_documents" ADD CONSTRAINT "purchase_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_documents" ADD CONSTRAINT "purchase_documents_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_documents" ADD CONSTRAINT "purchase_documents_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchase_company_period" ON "purchase_documents" USING btree ("company_id","fiscal_period_id","status");