-- The seat an applicant chose on the public join form. It is a request, not a
-- reservation: the seat keeps its AVAILABLE status until the owner approves
-- the application and it is assigned. Nullable so applications made before
-- this column existed, and rows whose seat was later removed, stay valid.

ALTER TABLE "Application" ADD COLUMN "preferredSeatId" INTEGER;

CREATE INDEX "Application_preferredSeatId_idx" ON "Application"("preferredSeatId");

ALTER TABLE "Application"
  ADD CONSTRAINT "Application_preferredSeatId_fkey"
  FOREIGN KEY ("preferredSeatId") REFERENCES "Seat"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
