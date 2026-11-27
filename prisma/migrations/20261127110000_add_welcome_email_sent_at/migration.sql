-- The final welcome email is a one-time message. Claim it before sending and
-- remember every approval that already happened, so no row can be resent.
ALTER TABLE "Application" ADD COLUMN "welcomeEmailSentAt" TIMESTAMP(3);

UPDATE "Application"
SET "welcomeEmailSentAt" = COALESCE("decidedAt", "createdAt")
WHERE "status" = 'APPROVED';
