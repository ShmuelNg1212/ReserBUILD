CREATE TABLE "sign_in_failures" (
	"failure_id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"failed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sign_in_failures_email_failed_at" ON "sign_in_failures" USING btree ("email","failed_at");