-- Lockers belong to a particular desk, not to a whole room: the owner decides
-- seat by seat which ones have one. Existing seats are plain seats until they
-- are ticked, so nothing changes for members already holding a seat.
ALTER TABLE "Seat" ADD COLUMN "hasLocker" BOOLEAN NOT NULL DEFAULT false;
