ALTER TABLE "payments" ALTER COLUMN "received_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "payment_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "cancel_reason" text;