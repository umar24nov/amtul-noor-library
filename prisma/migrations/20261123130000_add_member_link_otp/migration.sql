-- CreateTable
CREATE TABLE "MemberLinkOtp" (
    "id" SERIAL NOT NULL,
    "payToken" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberLinkOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberLinkOtp_payToken_createdAt_idx" ON "MemberLinkOtp"("payToken", "createdAt");

-- CreateIndex
CREATE INDEX "MemberLinkOtp_createdAt_idx" ON "MemberLinkOtp"("createdAt");
