-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "body_measurements" ADD COLUMN     "bust" DOUBLE PRECISION,
ADD COLUMN     "underbust" DOUBLE PRECISION,
ALTER COLUMN "chest" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gender" "Gender";
