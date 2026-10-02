-- 0001-equivalente extensions (DATABASE.md): btree_gist (EXCLUDE vigencias), pgcrypto (uuid), citext (RIF normalizado)
CREATE EXTENSION IF NOT EXISTS "btree_gist";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "citext";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_user" (
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_user_company_id_user_id_pk" PRIMARY KEY("company_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"direccion" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_branches_company_codigo" UNIQUE("company_id","codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rif" "citext" NOT NULL,
	"rif_original" text NOT NULL,
	"razon_social" text NOT NULL,
	"domicilio_fiscal" text,
	"condicion_iva" text NOT NULL,
	"contribuyente_especial_desde" date,
	"agente_retencion_iva" boolean DEFAULT false NOT NULL,
	"agente_retencion_islr" boolean DEFAULT false NOT NULL,
	"period_kind" text DEFAULT 'monthly' NOT NULL,
	"currency_functional" text DEFAULT 'VES' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_rif_unique" UNIQUE("rif")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"rif" "citext" NOT NULL,
	"rif_original" text NOT NULL,
	"razon_social" text NOT NULL,
	"direccion_fiscal" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_parties_company_rif" UNIQUE("company_id","rif")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_tax_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"tipo_persona" text NOT NULL,
	"residente" boolean DEFAULT true NOT NULL,
	"condicion_iva" text,
	"sujeto_retencion_iva" boolean DEFAULT false NOT NULL,
	"sujeto_retencion_islr" boolean DEFAULT false NOT NULL,
	"effective_range" daterange NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fiscal_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"range" daterange NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"closure_hash" text,
	"reopen_reason" text,
	"reopened_by" uuid,
	"reopened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_periods_company_kind_range" UNIQUE("company_id","kind","range")
);
