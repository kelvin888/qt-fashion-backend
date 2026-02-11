-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "OrderStatus" ADD VALUE 'PAID';
ALTER TYPE "OrderStatus" ADD VALUE 'IN_PRODUCTION';
ALTER TYPE "OrderStatus" ADD VALUE 'READY_TO_SHIP';
ALTER TYPE "OrderStatus" ADD VALUE 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_CONFIRMATION';
ALTER TYPE "OrderStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "OrderStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "autoConfirmAt" TIMESTAMP(3),
ADD COLUMN     "buyerProtectionUntil" TIMESTAMP(3),
ADD COLUMN     "confirmationWindowEnd" TIMESTAMP(3),
ADD COLUMN     "confirmationWindowStart" TIMESTAMP(3),
ADD COLUMN     "customerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryConfirmedBy" TEXT,
ADD COLUMN     "disputeOpenedAt" TIMESTAMP(3),
ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeResolution" TEXT,
ADD COLUMN     "paymentAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentReleasedAt" TIMESTAMP(3),
ADD COLUMN     "platformFee" DOUBLE PRECISION,
ADD COLUMN     "shippedAt" TIMESTAMP(3);
