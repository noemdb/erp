CREATE TABLE IF NOT EXISTS "fiscal_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"descripcion" text,
	CONSTRAINT "uq_holidays" UNIQUE("company_id","fecha")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fiscal_obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"fuente_normativa" text NOT NULL,
	"articulo" text NOT NULL,
	"effective_range" text NOT NULL,
	"base_calculo" text DEFAULT 'next_period' NOT NULL,
	"dias_habiles" integer DEFAULT 2 NOT NULL,
	"params" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_obligations" UNIQUE("company_id","kind")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fiscal_holidays" ADD CONSTRAINT "fiscal_holidays_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fiscal_obligations" ADD CONSTRAINT "fiscal_obligations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
