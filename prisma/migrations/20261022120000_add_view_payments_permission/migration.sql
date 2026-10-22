-- A read-only payments area.
--
-- Some people need to see what has been collected without being able to change
-- a record. This adds a permission for that, alongside the existing one that
-- allows recording and editing payments. The value is added at the end of the
-- enum so the existing order is untouched.

-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'PAYMENTS_VIEW';
