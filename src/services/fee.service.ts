/**
 * Fee Service
 * Handles dynamic fee calculation based on tiers, overrides, and promotional periods
 */

import prisma from '../config/database';
import settingsService from './settings.service';
import { FeeTier, DesignerFeeOverride, FeePromotionalPeriod } from '@prisma/client';

export interface FeeCalculation {
  percentage: number; // Fee percentage (0.10 = 10%)
  feeAmount: number; // Actual fee amount in naira
  designerReceives: number; // Amount designer receives after fee
  appliedRule: 'DEFAULT' | 'TIER' | 'OVERRIDE' | 'PROMOTION';
  ruleDetails?: string; // e.g., "Silver Tier" or "Holiday Promotion"
}

class FeeService {
  /**
   * Calculate fee for a specific designer and order amount
   * Priority: Override →  Promotional Period → Tier → Default
   */
  async calculateFeeForDesigner(
    designerId: string,
    orderTotal: number,
    orderDate: Date = new Date()
  ): Promise<FeeCalculation> {
    // 1. Check for designer-specific override (highest priority)
    const override = await this.getActiveOverride(designerId, orderDate);
    if (override) {
      return this.buildFeeCalculation(
        override.feePercentage,
        orderTotal,
        'OVERRIDE',
        `Custom rate`
      );
    }

    // 2. Check for active promotional period
    const promotion = await this.getActivePromotion(orderDate);
    if (promotion) {
      return this.buildFeeCalculation(
        promotion.feePercentage,
        orderTotal,
        'PROMOTION',
        promotion.name
      );
    }

    // 3. Check designer tier based on completed orders
    const tier = await this.getDesignerTier(designerId);
    if (tier) {
      return this.buildFeeCalculation(tier.feePercentage, orderTotal, 'TIER', `${tier.name} Tier`);
    }

    // 4. Fall back to default platform fee
    const defaultFee = await settingsService.getPlatformFee();
    return this.buildFeeCalculation(defaultFee, orderTotal, 'DEFAULT', 'Default rate');
  }

  /**
   * Get designer's current tier based on completed order count
   */
  async getDesignerTier(designerId: string): Promise<FeeTier | null> {
    // Count completed orders for this designer
    const completedOrderCount = await prisma.order.count({
      where: {
        designerId,
        status: 'COMPLETED',
      },
    });

    // Find matching tier
    const tier = await prisma.feeTier.findFirst({
      where: {
        isActive: true,
        minOrders: { lte: completedOrderCount },
        OR: [{ maxOrders: null }, { maxOrders: { gte: completedOrderCount } }],
      },
      orderBy: { priority: 'desc' }, // Higher priority tiers first
    });

    return tier;
  }

  /**
   * Get active override for a designer
   */
  private async getActiveOverride(
    designerId: string,
    checkDate: Date
  ): Promise<DesignerFeeOverride | null> {
    return prisma.designerFeeOverride.findFirst({
      where: {
        designerId,
        effectiveFrom: { lte: checkDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: checkDate } }],
      },
    });
  }

  /**
   * Get active promotional period
   */
  private async getActivePromotion(checkDate: Date): Promise<FeePromotionalPeriod | null> {
    return prisma.feePromotionalPeriod.findFirst({
      where: {
        isActive: true,
        startDate: { lte: checkDate },
        endDate: { gte: checkDate },
      },
    });
  }

  /**
   * Create a fee override for a specific designer
   */
  async createFeeOverride(
    designerId: string,
    feePercentage: number,
    effectiveFrom: Date,
    effectiveUntil: Date | null,
    reason: string,
    createdBy: string
  ): Promise<DesignerFeeOverride> {
    return prisma.designerFeeOverride.create({
      data: {
        designerId,
        feePercentage,
        effectiveFrom,
        effectiveUntil,
        reason,
        createdBy,
      },
    });
  }

  /**
   * Create a promotional period with reduced fees
   */
  async createPromotionalPeriod(data: {
    name: string;
    feePercentage: number;
    startDate: Date;
    endDate: Date;
    applicableToAll?: boolean;
    createdBy: string;
  }): Promise<FeePromotionalPeriod> {
    return prisma.feePromotionalPeriod.create({
      data: {
        name: data.name,
        feePercentage: data.feePercentage,
        startDate: data.startDate,
        endDate: data.endDate,
        applicableToAll: data.applicableToAll ?? true,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * List all fee tiers
   */
  async listFeeTiers(): Promise<FeeTier[]> {
    return prisma.feeTier.findMany({
      where: { isActive: true },
      orderBy: { minOrders: 'asc' },
    });
  }

  /**
   * List all designer overrides
   */
  async listDesignerOverrides(): Promise<
    Array<DesignerFeeOverride & { designer: { fullName: string; email: string } }>
  > {
    return prisma.designerFeeOverride.findMany({
      include: {
        designer: {
          select: {
            fullName: true,
            email: true,
            brandName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all promotional periods
   */
  async listPromotionalPeriods(): Promise<FeePromotionalPeriod[]> {
    return prisma.feePromotionalPeriod.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Get active promotional periods
   */
  async getActivePromotionalPeriods(): Promise<FeePromotionalPeriod[]> {
    const now = new Date();
    return prisma.feePromotionalPeriod.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  /**
   * Build fee calculation result
   */
  private buildFeeCalculation(
    percentage: number,
    orderTotal: number,
    rule: FeeCalculation['appliedRule'],
    details: string
  ): FeeCalculation {
    const feeAmount = orderTotal * percentage;
    const designerReceives = orderTotal - feeAmount;

    return {
      percentage,
      feeAmount,
      designerReceives,
      appliedRule: rule,
      ruleDetails: details,
    };
  }
}

export default new FeeService();
