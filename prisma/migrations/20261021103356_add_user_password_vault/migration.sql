-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'PASSWORD_CHANGED';
ALTER TYPE "ActivityAction" ADD VALUE 'PASSWORD_VIEWED';

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "permissions" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordCiphertext" TEXT;
