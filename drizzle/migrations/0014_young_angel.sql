ALTER TABLE "withholding_rules" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "withholding_rules" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "withholding_rules" ADD COLUMN "change_reason" text;