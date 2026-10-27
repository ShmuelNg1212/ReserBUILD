-- Stop two active reservations for one space from overlapping in time.
-- Ranges are half-open [start, end), so back-to-back bookings are allowed.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist ("space_id" WITH =, tstzrange("start_at", "end_at", '[)') WITH &&)
  WHERE ("status" IN ('pending', 'confirmed', 'checked_in'));
