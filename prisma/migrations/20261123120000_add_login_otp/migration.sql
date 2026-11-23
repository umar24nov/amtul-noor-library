-- CreateTable
CREATE TABLE "LoginOtp" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginOtp_email_createdAt_idx" ON "LoginOtp"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginOtp_createdAt_idx" ON "LoginOtp"("createdAt");
