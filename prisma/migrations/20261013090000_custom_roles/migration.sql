-- Custom, owner-named roles.
--
-- Replaces the fixed ADMIN/STAFF enum on User with a Role table the owner can
-- name themselves. A role's abilities come from RoleLevel (ADMIN or DAY_TO_DAY);
-- the old ADMIN and STAFF values map onto the two seeded roles below, so any
-- existing accounts keep the access they had.

-- CreateEnum
CREATE TYPE "RoleLevel" AS ENUM ('ADMIN', 'DAY_TO_DAY');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" "RoleLevel" NOT NULL,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Role_level_idx" ON "Role"("level");

-- Seed the two roles every library begins with. "Admin" is the protected
-- full-admin role; "Staff" is the day-to-day role, which the owner may rename.
INSERT INTO "Role" ("name", "level", "builtIn", "updatedAt") VALUES
    ('Admin', 'ADMIN', true, CURRENT_TIMESTAMP),
    ('Staff', 'DAY_TO_DAY', false, CURRENT_TIMESTAMP);

-- Point existing accounts at the role matching the level they already had.
ALTER TABLE "User" ADD COLUMN "roleId" INTEGER;

UPDATE "User"
SET "roleId" = (SELECT "id" FROM "Role" WHERE "level" = 'ADMIN' ORDER BY "id" LIMIT 1)
WHERE "role" = 'ADMIN';

UPDATE "User"
SET "roleId" = (SELECT "id" FROM "Role" WHERE "level" = 'DAY_TO_DAY' ORDER BY "id" LIMIT 1)
WHERE "role" <> 'ADMIN';

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop the old column, its index, and the enum it used.
DROP INDEX "User_role_idx";
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "UserRole";
