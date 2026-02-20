-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "feePercentageApplied" DOUBLE PRECISION,
ADD COLUMN     "feeRuleApplied" TEXT;

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT 'string',
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minOrders" INTEGER NOT NULL,
    "maxOrders" INTEGER,
    "feePercentage" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designer_fee_overrides" (
    "id" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "feePercentage" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designer_fee_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_promotional_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feePercentage" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "applicableToAll" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_promotional_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_audit_logs" (
    "id" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "settingId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "ipAddress" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "platform_settings_key_idx" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "platform_settings_category_idx" ON "platform_settings"("category");

-- CreateIndex
CREATE INDEX "fee_tiers_isActive_idx" ON "fee_tiers"("isActive");

-- CreateIndex
CREATE INDEX "fee_tiers_priority_idx" ON "fee_tiers"("priority");

-- CreateIndex
CREATE INDEX "designer_fee_overrides_designerId_idx" ON "designer_fee_overrides"("designerId");

-- CreateIndex
CREATE INDEX "designer_fee_overrides_effectiveFrom_idx" ON "designer_fee_overrides"("effectiveFrom");

-- CreateIndex
CREATE INDEX "designer_fee_overrides_effectiveUntil_idx" ON "designer_fee_overrides"("effectiveUntil");

-- CreateIndex
CREATE INDEX "fee_promotional_periods_startDate_idx" ON "fee_promotional_periods"("startDate");

-- CreateIndex
CREATE INDEX "fee_promotional_periods_endDate_idx" ON "fee_promotional_periods"("endDate");

-- CreateIndex
CREATE INDEX "fee_promotional_periods_isActive_idx" ON "fee_promotional_periods"("isActive");

-- CreateIndex
CREATE INDEX "settings_audit_logs_settingKey_idx" ON "settings_audit_logs"("settingKey");

-- CreateIndex
CREATE INDEX "settings_audit_logs_changedBy_idx" ON "settings_audit_logs"("changedBy");

-- CreateIndex
CREATE INDEX "settings_audit_logs_changedAt_idx" ON "settings_audit_logs"("changedAt");

-- AddForeignKey
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designer_fee_overrides" ADD CONSTRAINT "designer_fee_overrides_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designer_fee_overrides" ADD CONSTRAINT "designer_fee_overrides_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_promotional_periods" ADD CONSTRAINT "fee_promotional_periods_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_audit_logs" ADD CONSTRAINT "settings_audit_logs_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "platform_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_audit_logs" ADD CONSTRAINT "settings_audit_logs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
