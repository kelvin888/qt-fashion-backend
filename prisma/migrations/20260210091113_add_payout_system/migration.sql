-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountName" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "accountVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bankCode" TEXT,
ADD COLUMN     "bankName" TEXT;

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "recipientBank" TEXT NOT NULL,
    "recipientAccount" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "interswitchReference" TEXT,
    "processingReference" TEXT,
    "responseCode" TEXT,
    "responseMessage" TEXT,
    "narration" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payouts_transactionReference_key" ON "payouts"("transactionReference");

-- CreateIndex
CREATE INDEX "payouts_userId_idx" ON "payouts"("userId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_transactionReference_idx" ON "payouts"("transactionReference");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
