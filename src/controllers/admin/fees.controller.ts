/**
 * Admin Fees Controller
 * Handles fee tiers, overrides, and promotional periods (admin only)
 */

import { Request, Response, NextFunction } from 'express';
import feeService from '../../services/fee.service';
import prisma from '../../config/database';

/**
 * List all fee tiers
 */
export const listFeeTiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tiers = await feeService.listFeeTiers();

    res.status(200).json({
      success: true,
      data: tiers,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Create a new fee tier
 */
export const createFeeTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, minOrders, maxOrders, feePercentage, priority } = req.body;

    // Validation
    if (!name || minOrders === undefined || feePercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, minOrders, and feePercentage are required',
      });
    }

    if (feePercentage < 0 || feePercentage > 1) {
      return res.status(400).json({
        success: false,
        message: 'Fee percentage must be between 0 and 1',
      });
    }

    const tier = await prisma.feeTier.create({
      data: {
        name,
        minOrders,
        maxOrders,
        feePercentage,
        priority: priority || 0,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Fee tier created successfully',
      data: tier,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Update a fee tier
 */
export const updateFeeTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, minOrders, maxOrders, feePercentage, priority, isActive } = req.body;

    const tier = await prisma.feeTier.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(minOrders !== undefined && { minOrders }),
        ...(maxOrders !== undefined && { maxOrders }),
        ...(feePercentage !== undefined && { feePercentage }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Fee tier updated successfully',
      data: tier,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Delete (deactivate) a fee tier
 */
export const deleteFeeTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const tier = await prisma.feeTier.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({
      success: true,
      message: 'Fee tier deactivated successfully',
      data: tier,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * List all designer overrides
 */
export const listDesignerOverrides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const overrides = await feeService.listDesignerOverrides();

    res.status(200).json({
      success: true,
      data: overrides,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Create a designer fee override
 */
export const createDesignerOverride = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { designerId, feePercentage, effectiveFrom, effectiveUntil, reason } = req.body;
    const adminId = req.user!.id;

    // Validation
    if (!designerId || feePercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Designer ID and fee percentage are required',
      });
    }

    if (feePercentage < 0 || feePercentage > 1) {
      return res.status(400).json({
        success: false,
        message: 'Fee percentage must be between 0 and 1',
      });
    }

    // Verify designer exists
    const designer = await prisma.user.findUnique({
      where: { id: designerId, role: 'DESIGNER' },
    });

    if (!designer) {
      return res.status(404).json({
        success: false,
        message: 'Designer not found',
      });
    }

    const override = await feeService.createFeeOverride(
      designerId,
      feePercentage,
      effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveUntil ? new Date(effectiveUntil) : null,
      reason || '',
      adminId
    );

    res.status(201).json({
      success: true,
      message: 'Designer fee override created successfully',
      data: override,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Delete a designer override
 */
export const deleteDesignerOverride = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.designerFeeOverride.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Designer fee override deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * List all promotional periods
 */
export const listPromotionalPeriods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await feeService.listPromotionalPeriods();

    res.status(200).json({
      success: true,
      data: promotions,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Create a promotional period
 */
export const createPromotionalPeriod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, feePercentage, startDate, endDate, applicableToAll } = req.body;
    const adminId = req.user!.id;

    // Validation
    if (!name || feePercentage === undefined || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, fee percentage, start date, and end date are required',
      });
    }

    if (feePercentage < 0 || feePercentage > 1) {
      return res.status(400).json({
        success: false,
        message: 'Fee percentage must be between 0 and 1',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    const promotion = await feeService.createPromotionalPeriod({
      name,
      feePercentage,
      startDate: start,
      endDate: end,
      applicableToAll: applicableToAll ?? true,
      createdBy: adminId,
    });

    res.status(201).json({
      success: true,
      message: 'Promotional period created successfully',
      data: promotion,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Toggle promotional period active status
 */
export const togglePromotionalPeriod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const promotion = await prisma.feePromotionalPeriod.findUnique({
      where: { id },
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotional period not found',
      });
    }

    const updated = await prisma.feePromotionalPeriod.update({
      where: { id },
      data: { isActive: !promotion.isActive },
    });

    res.status(200).json({
      success: true,
      message: `Promotional period ${updated.isActive ? 'activated' : 'deactivated'}`,
      data: updated,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get fee analytics
 */
export const getFeeAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate as string) }),
      ...(endDate && { lte: new Date(endDate as string) }),
    };

    // Get total revenue from fees
    const revenue = await prisma.order.aggregate({
      _sum: {
        platformFee: true,
      },
      where: {
        platformFee: { not: null },
        ...(Object.keys(dateFilter).length > 0 && {
          paymentReleasedAt: dateFilter,
        }),
      },
    });

    // Get total orders count
    const orderCount = await prisma.order.count({
      where: {
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
    });

    // Get average fee percentage
    const ordersWithFees = await prisma.order.findMany({
      where: {
        feePercentageApplied: { not: null },
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
      select: {
        feePercentageApplied: true,
      },
    });

    const averageFeePercentage =
      ordersWithFees.length > 0
        ? ordersWithFees.reduce((sum, order) => sum + (order.feePercentageApplied || 0), 0) /
          ordersWithFees.length
        : 0;

    // Get designer tier distribution
    const designers = await prisma.user.findMany({
      where: { role: 'DESIGNER' },
      select: { id: true },
    });

    const tierDistribution: Record<string, number> = {};
    for (const designer of designers) {
      const tier = await feeService.getDesignerTier(designer.id);
      const tierName = tier?.name || 'No Tier';
      tierDistribution[tierName] = (tierDistribution[tierName] || 0) + 1;
    }

    // Convert tier distribution to array format
    const tierDistributionArray = Object.entries(tierDistribution).map(
      ([tierName, designerCount]) => ({
        tierName,
        designerCount,
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: revenue._sum.platformFee || 0,
        totalOrders: orderCount,
        averageFeePercentage,
        tierDistribution: tierDistributionArray,
      },
    });
  } catch (error: any) {
    next(error);
  }
};
