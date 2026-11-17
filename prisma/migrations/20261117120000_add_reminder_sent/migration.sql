-- CreateTable
CREATE TABLE "ReminderSent" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderSent_month_idx" ON "ReminderSent"("month");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSent_memberId_month_key" ON "ReminderSent"("memberId", "month");

-- AddForeignKey
ALTER TABLE "ReminderSent" ADD CONSTRAINT "ReminderSent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
