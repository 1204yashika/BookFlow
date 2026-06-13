-- Enable the extension that lets us index/compare ranges
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add the exclusion constraint:
-- "No two bookings may share the same staffId AND have overlapping [startAt, endAt) time ranges"
-- ...but only when the booking is actually active (not cancelled).
ALTER TABLE "Booking"
ADD CONSTRAINT booking_no_overlap
EXCLUDE USING gist (
  "staffId" WITH =,
  tsrange("startAt", "endAt") WITH &&
)
WHERE (status <> 'CANCELLED');