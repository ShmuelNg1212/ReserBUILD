CREATE TYPE "public"."day_of_week" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'e_wallet', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'voided');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."space_type" AS ENUM('build', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'faculty', 'admin');--> statement-breakpoint
CREATE TABLE "charges" (
	"charge_id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"rate_id" integer NOT NULL,
	"segment_start" timestamp with time zone NOT NULL,
	"segment_end" timestamp with time zone NOT NULL,
	"hours" numeric(6, 2) NOT NULL,
	"rate_applied" numeric(10, 2) NOT NULL,
	"amount" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"participant_id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"user_id" integer,
	"full_name" text NOT NULL,
	"email" text,
	"affiliation" text,
	"attended" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"payment_id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference_no" text,
	"status" "payment_status" NOT NULL,
	"paid_at" timestamp with time zone,
	"received_by" text NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"rate_id" serial PRIMARY KEY NOT NULL,
	"space_id" integer,
	"day_of_week" "day_of_week",
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"is_peak" boolean DEFAULT false NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	CONSTRAINT "rates_window_valid" CHECK ("rates"."end_time" > "rates"."start_time"),
	CONSTRAINT "rates_hourly_rate_positive" CHECK ("rates"."hourly_rate" > 0),
	CONSTRAINT "rates_effective_valid" CHECK ("rates"."effective_to" is null or "rates"."effective_to" >= "rates"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"reservation_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"space_id" integer NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"purpose" text NOT NULL,
	"headcount" integer NOT NULL,
	"status" "reservation_status" DEFAULT 'confirmed' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_in_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "reservations_time_valid" CHECK ("reservations"."end_at" > "reservations"."start_at"),
	CONSTRAINT "reservations_headcount_positive" CHECK ("reservations"."headcount" > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"space_id" serial PRIMARY KEY NOT NULL,
	"code" char(1) NOT NULL,
	"name" text NOT NULL,
	"space_type" "space_type" NOT NULL,
	"capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "spaces_code_unique" UNIQUE("code"),
	CONSTRAINT "spaces_code_valid" CHECK ("spaces"."code" in ('A', 'B', 'C', 'D')),
	CONSTRAINT "spaces_capacity_positive" CHECK ("spaces"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" "user_role" NOT NULL,
	"department" text,
	"program" text,
	"year_level" integer,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_school_id_unique" UNIQUE("school_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_year_level_by_role" CHECK (("users"."role" = 'student' and "users"."year_level" is not null) or ("users"."role" <> 'student' and "users"."year_level" is null))
);
--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_reservation_id_reservations_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("reservation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_rate_id_rates_rate_id_fk" FOREIGN KEY ("rate_id") REFERENCES "public"."rates"("rate_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_reservation_id_reservations_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("reservation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_reservations_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("reservation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_space_id_spaces_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_space_id_spaces_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservations_user_idx" ON "reservations" USING btree ("user_id");