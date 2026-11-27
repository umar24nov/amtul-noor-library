-- Member Activity now has its own permission instead of borrowing Users.
-- Prisma cannot use a new enum value in the same transaction that adds it on
-- some PostgreSQL versions, so the backfill lives in the next migration.
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MEMBER_ACTIVITY';
