-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "receiptToken" TEXT;

-- Backfill every existing payment with an unguessable token so its receipt
-- can be fetched through the public /receipts/<token> route without a login.
UPDATE "Payment"
SET "receiptToken" = replace(gen_random_uuid()::text, '-', '')
WHERE "receiptToken" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptToken_key" ON "Payment"("receiptToken");