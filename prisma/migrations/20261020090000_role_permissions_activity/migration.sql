-- Per-role permissions and an activity log.
--
-- Roles were only coarse levels (ADMIN / DAY_TO_DAY). This adds a list of
-- permission areas to each role so the owner can tick exactly what a role may
-- do, and an ActivityLog so the Users screen can show who signed in or out and
-- whose access changed.

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('MEMBERS', 'APPLICATIONS', 'PAYMENTS', 'REMINDERS', 'SEATS', 'REPORTS', 'SETTINGS', 'USERS');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('LOGIN', 'LOGOUT', 'ROLE_CHANGED', 'DEACTIVATED', 'REACTIVATED');

-- Add the permissions column. Existing roles get sensible defaults: a full
-- admin keeps everything, a day-to-day role gets the library work.
ALTER TABLE "Role" ADD COLUMN "permissions" "Permission"[] NOT NULL DEFAULT ARRAY[]::"Permission"[];

UPDATE "Role"
SET "permissions" = ARRAY[
    'MEMBERS', 'APPLICATIONS', 'PAYMENTS', 'REMINDERS', 'SEATS', 'REPORTS', 'SETTINGS', 'USERS'
]::"Permission"[]
WHERE "level" = 'ADMIN';

UPDATE "Role"
SET "permissions" = ARRAY[
    'MEMBERS', 'APPLICATIONS', 'PAYMENTS', 'REMINDERS', 'SEATS', 'REPORTS'
]::"Permission"[]
WHERE "level" = 'DAY_TO_DAY';

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
