-- An application can be rejected with a reason the owner writes, which is
-- shown on the application card and included in the rejection email.

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "rejectionReason" TEXT;
