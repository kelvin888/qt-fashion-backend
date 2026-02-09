/*
  Warnings:

  - The values [CONFIRMED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[paymentTransactionId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CustomRequestStatus" AS ENUM ('OPEN', 'CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MeasurementCaptureMethod" AS ENUM ('PHOTO', 'MANUAL');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'SOURCING', 'CONSTRUCTION', 'QUALITY_CHECK', 'SHIPPING', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "body_measurements" ADD COLUMN     "captureMethod" "MeasurementCaptureMethod" NOT NULL DEFAULT 'PHOTO',
ALTER COLUMN "frontPhoto" DROP NOT NULL;

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "tryOnImageUrl" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentTransactionId" TEXT,
ADD COLUMN     "shippingAddressId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "orderId" TEXT,
    "txnRef" TEXT NOT NULL,
    "paymentReference" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT '566',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "responseCode" TEXT,
    "responseDescription" TEXT,
    "retriesCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "referenceImages" TEXT[],
    "budget" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "requirements" JSONB,
    "measurements" JSONB NOT NULL,
    "status" "CustomRequestStatus" NOT NULL DEFAULT 'OPEN',
    "selectedBidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "custom_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_request_bids" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "timeline" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "portfolioImages" TEXT[],
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_request_bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");

-- CreateIndex
CREATE INDEX "addresses_userId_isDefault_idx" ON "addresses"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_txnRef_key" ON "payment_transactions"("txnRef");

-- CreateIndex
CREATE INDEX "payment_transactions_offerId_idx" ON "payment_transactions"("offerId");

-- CreateIndex
CREATE INDEX "payment_transactions_txnRef_idx" ON "payment_transactions"("txnRef");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_expiresAt_idx" ON "payment_transactions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "custom_requests_selectedBidId_key" ON "custom_requests"("selectedBidId");

-- CreateIndex
CREATE INDEX "custom_requests_customerId_idx" ON "custom_requests"("customerId");

-- CreateIndex
CREATE INDEX "custom_requests_status_idx" ON "custom_requests"("status");

-- CreateIndex
CREATE INDEX "custom_requests_category_idx" ON "custom_requests"("category");

-- CreateIndex
CREATE INDEX "custom_request_bids_requestId_idx" ON "custom_request_bids"("requestId");

-- CreateIndex
CREATE INDEX "custom_request_bids_designerId_idx" ON "custom_request_bids"("designerId");

-- CreateIndex
CREATE INDEX "custom_request_bids_status_idx" ON "custom_request_bids"("status");

-- CreateIndex
CREATE UNIQUE INDEX "custom_request_bids_requestId_designerId_key" ON "custom_request_bids"("requestId", "designerId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_paymentTransactionId_key" ON "orders"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "orders_paymentTransactionId_idx" ON "orders"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "orders_shippingAddressId_idx" ON "orders"("shippingAddressId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_requests" ADD CONSTRAINT "custom_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_requests" ADD CONSTRAINT "custom_requests_selectedBidId_fkey" FOREIGN KEY ("selectedBidId") REFERENCES "custom_request_bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_request_bids" ADD CONSTRAINT "custom_request_bids_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "custom_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_request_bids" ADD CONSTRAINT "custom_request_bids_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
