-- CreateTable
CREATE TABLE "MemberAuditLog" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "changes" JSONB,
    "metadata" JSONB,
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberAuditLog_memberId_createdAt_idx" ON "MemberAuditLog"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "MemberAuditLog_actorId_createdAt_idx" ON "MemberAuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "MemberAuditLog" ADD CONSTRAINT "MemberAuditLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAuditLog" ADD CONSTRAINT "MemberAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;