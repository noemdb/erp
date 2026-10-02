CREATE TABLE IF NOT EXISTS "document_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid,
	"kind" text NOT NULL,
	"period_key" text NOT NULL,
	"prefix" text,
	"last_number" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "uq_series" UNIQUE("company_id","branch_id","kind","period_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "islr_withholding_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"withholding_id" uuid NOT NULL,
	"base_sujeta" numeric(18, 2) NOT NULL,
	"porcentaje" numeric(18, 6) NOT NULL,
	"sustraendo" numeric(18, 2) DEFAULT '0' NOT NULL,
	"retained_amount" numeric(18, 2) NOT NULL,
	"explanation" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "islr_withholdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"fiscal_period_id" uuid NOT NULL,
	"concept_id" uuid,
	"payment_id" uuid,
	"certificate_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"fecha_emision" date,
	"rule_version_id" uuid,
	"rule_snapshot" jsonb NOT NULL,
	"total_retained" numeric(18, 2) NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"replaces_id" uuid,
	"data_snapshot" jsonb NOT NULL,
	CONSTRAINT "uq_islr_cert" UNIQUE("company_id","certificate_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "iva_withholding_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"withholding_id" uuid NOT NULL,
	"purchase_document_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"control_number" text NOT NULL,
	"taxable_base" numeric(18, 2) NOT NULL,
	"vat_amount" numeric(18, 2) NOT NULL,
	"retention_rate" numeric(18, 6) NOT NULL,
	"retained_amount" numeric(18, 2) NOT NULL,
	"explanation" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "iva_withholdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"fiscal_period_id" uuid NOT NULL,
	"certificate_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"fecha_emision" date,
	"fecha_entrega" date,
	"rule_version_id" uuid,
	"rule_snapshot" jsonb NOT NULL,
	"total_retained" numeric(18, 2) NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"replaces_id" uuid,
	"pdf_sha256" text,
	"data_snapshot" jsonb NOT NULL,
	CONSTRAINT "uq_iva_cert" UNIQUE("company_id","certificate_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "withholding_concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"base_formula_kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "withholding_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_scope_key" uuid NOT NULL,
	"rule_kind" text NOT NULL,
	"concept_id" uuid,
	"effective_range" daterange NOT NULL,
	"porcentaje" numeric(18, 6) NOT NULL,
	"sustraendo" numeric(18, 2) DEFAULT '0' NOT NULL,
	"base_formula_kind" text NOT NULL,
	"conditions" jsonb,
	"legal_reference" text,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_series" ADD CONSTRAINT "document_series_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islr_withholding_lines" ADD CONSTRAINT "islr_withholding_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islr_withholding_lines" ADD CONSTRAINT "islr_withholding_lines_withholding_id_islr_withholdings_id_fk" FOREIGN KEY ("withholding_id") REFERENCES "public"."islr_withholdings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islr_withholdings" ADD CONSTRAINT "islr_withholdings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islr_withholdings" ADD CONSTRAINT "islr_withholdings_beneficiary_id_parties_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islr_withholdings" ADD CONSTRAINT "islr_withholdings_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islr_withholdings" ADD CONSTRAINT "islr_withholdings_concept_id_withholding_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."withholding_concepts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islr_withholdings" ADD CONSTRAINT "islr_withholdings_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islr_withholdings" ADD CONSTRAINT "islr_withholdings_rule_version_id_withholding_rules_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "public"."withholding_rules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iva_withholding_lines" ADD CONSTRAINT "iva_withholding_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iva_withholding_lines" ADD CONSTRAINT "iva_withholding_lines_withholding_id_iva_withholdings_id_fk" FOREIGN KEY ("withholding_id") REFERENCES "public"."iva_withholdings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iva_withholding_lines" ADD CONSTRAINT "iva_withholding_lines_purchase_document_id_purchase_documents_id_fk" FOREIGN KEY ("purchase_document_id") REFERENCES "public"."purchase_documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iva_withholdings" ADD CONSTRAINT "iva_withholdings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iva_withholdings" ADD CONSTRAINT "iva_withholdings_beneficiary_id_parties_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iva_withholdings" ADD CONSTRAINT "iva_withholdings_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iva_withholdings" ADD CONSTRAINT "iva_withholdings_rule_version_id_withholding_rules_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "public"."withholding_rules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withholding_rules" ADD CONSTRAINT "withholding_rules_concept_id_withholding_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."withholding_concepts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_iva_company_period" ON "iva_withholdings" USING btree ("company_id","fiscal_period_id","status");
--> statement-breakpoint
-- Serie por empresa sin sucursal: unique parcial (branch_id NULL nunca matchea un unique total)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_series_company_kind_period" ON "document_series" ("company_id","kind","period_key") WHERE "branch_id" IS NULL;
--> statement-breakpoint
-- ADR-004: no solapamiento de vigencias por (scope, tipo, concepto, rango)
ALTER TABLE "withholding_rules" ADD CONSTRAINT "no_overlap_rules" EXCLUDE USING gist ("company_scope_key" WITH =, "rule_kind" WITH =, "concept_id" WITH =, "effective_range" WITH &&);