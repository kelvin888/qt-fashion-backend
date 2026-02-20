-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "customRequestId" TEXT,
ADD COLUMN     "offerId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_offerId_idx" ON "notifications"("offerId");

-- CreateIndex
CREATE INDEX "notifications_customRequestId_idx" ON "notifications"("customRequestId");
