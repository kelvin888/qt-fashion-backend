/*
  Warnings:

  - The values [CONFIRMED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/

-- Step 1: Add PENDING to the enum (must be committed before use)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PENDING';
  END IF;
END $$;

-- Step 2: Update all existing CONFIRMED orders to use PENDING (separate transaction)
UPDATE "orders" SET "status" = 'PENDING' WHERE "status" = 'CONFIRMED';

-- Step 3: Recreate enum without CONFIRMED
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'SOURCING', 'CONSTRUCTION', 'QUALITY_CHECK', 'SHIPPING', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
