-- Keep member history when a member is deleted: detach the row instead of
-- removing it, and keep a readable member label on the event itself.
ALTER TABLE "MemberAuditLog" DROP CONSTRAINT "MemberAuditLog_memberId_fkey";

ALTER TABLE "MemberAuditLog" ALTER COLUMN "memberId" DROP NOT NULL;

ALTER TABLE "MemberAuditLog" ADD COLUMN "memberLabel" TEXT NOT NULL DEFAULT '';

ALTER TABLE "MemberAuditLog" ADD CONSTRAINT "MemberAuditLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
