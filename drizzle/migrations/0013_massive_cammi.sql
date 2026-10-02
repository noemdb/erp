CREATE TABLE IF NOT EXISTS "received_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"received_id" uuid NOT NULL,
	"purchase_document_id" uuid NOT NULL,
	"monto_imputado" numeric(18, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "withholdings_received" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_rif" text NOT NULL,
	"agent_razon" text NOT NULL,
	"certificate_number" text NOT NULL,
	"fecha_comprobante" date NOT NULL,
	"fecha_recepcion" date NOT NULL,
	"fiscal_period_id" uuid,
	"iva_causado" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_retenido" numeric(18, 2) NOT NULL,
	"status" text DEFAULT 'registrada' NOT NULL,
	"validated_by" uuid,
	"validated_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"void_reason" text,
	"notes" text,
	"evidence" jsonb,
	CONSTRAINT "uq_received" UNIQUE("company_id","agent_rif","certificate_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "received_links" ADD CONSTRAINT "received_links_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "received_links" ADD CONSTRAINT "received_links_received_id_withholdings_received_id_fk" FOREIGN KEY ("received_id") REFERENCES "public"."withholdings_received"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "received_links" ADD CONSTRAINT "received_links_purchase_document_id_purchase_documents_id_fk" FOREIGN KEY ("purchase_document_id") REFERENCES "public"."purchase_documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withholdings_received" ADD CONSTRAINT "withholdings_received_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withholdings_received" ADD CONSTRAINT "withholdings_received_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withholdings_received" ADD CONSTRAINT "withholdings_received_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
