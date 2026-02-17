-- CreateEnum
CREATE TYPE "ResponsibleParty" AS ENUM ('CUSTOMER', 'DESIGNER');

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "awaitingResponseFrom" "ResponsibleParty";
