-- AlterTable
ALTER TABLE "Member" ADD COLUMN "payToken" TEXT;

-- Backfill every existing member with an unguessable token so their reusable
-- /pay/<token> payment link works without any manual setup.
UPDATE "Member"
SET "payToken" = replace(gen_random_uuid()::text, '-', '')
WHERE "payToken" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Member_payToken_key" ON "Member"("payToken");