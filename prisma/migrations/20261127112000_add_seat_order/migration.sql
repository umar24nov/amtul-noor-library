-- A database page cannot sort a text seat number numerically ("10" would come
-- before "2"). Keep an integer copy for ordering; the app derives it whenever a
-- seat is created. Legacy non-numeric labels stay at 0 rather than failing the
-- migration.
ALTER TABLE "Seat" ADD COLUMN "seatOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Seat"
SET "seatOrder" = CAST("seatNumber" AS INTEGER)
WHERE "seatNumber" ~ '^[0-9]+$';
