-- Move every seat onto one global, plain-numbered list. Existing rows are
-- renumbered in place so members and applications keep their seat links:
-- Room 1's 01..22 become 1..22, and Room 2's 01..22 become 23..44.
-- The Room 2 guard makes this safe to rerun after a partial deployment: a row
-- already moved to 23..44 must not be shifted a second time.
UPDATE "Seat" AS s
SET "seatNumber" = CASE
  WHEN r."name" = 'Room 2' AND CAST(s."seatNumber" AS integer) BETWEEN 1 AND 22
    THEN (CAST(s."seatNumber" AS integer) + 22)::text
  ELSE CAST(s."seatNumber" AS integer)::text
END
FROM "Room" AS r
WHERE s."roomId" = r."id";

-- Locker status is fixed by the new number: seats 1-22 are plain, 23-44 have a
-- locker. This also corrects the earlier locker rollout, which left every row
-- false and expected staff to tick them one at a time.
UPDATE "Seat"
SET "hasLocker" = CAST("seatNumber" AS integer) >= 23;

-- The old composite uniqueness came from Prisma as a bare index in production,
-- but as a table constraint in other environments. Drop either form before the
-- column goes away, then make the plain seat number globally unique.
ALTER TABLE "Seat" DROP CONSTRAINT IF EXISTS "Seat_roomId_seatNumber_key";
DROP INDEX IF EXISTS "Seat_roomId_seatNumber_key";
ALTER TABLE "Seat" DROP CONSTRAINT IF EXISTS "Seat_roomId_fkey";
ALTER TABLE "Seat" DROP COLUMN IF EXISTS "roomId";
DROP TABLE IF EXISTS "Room";

CREATE UNIQUE INDEX IF NOT EXISTS "Seat_seatNumber_key" ON "Seat"("seatNumber");
