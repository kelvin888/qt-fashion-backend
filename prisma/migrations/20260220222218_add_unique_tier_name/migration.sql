/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `fee_tiers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "fee_tiers_name_key" ON "fee_tiers"("name");
