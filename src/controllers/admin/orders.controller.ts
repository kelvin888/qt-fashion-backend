/**
 * Admin Orders Controller
 * Handles order management operations (admin only)
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';

/**
 * Get all orders with filters and pagination
 */
export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { customer: { email: { contains: search as string, mode: 'insensitive' } } },
        { designer: { email: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
            },
          },
          designer: {
            select: {
              id: true,
              email: true,
              fullName: true,
              brandName: true,
            },
          },
          design: {
            select: {
              id: true,
              title: true,
              category: true,
              images: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get order statistics
 */
export const getOrderStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      inProductionOrders,
      completedOrders,
      cancelledOrders,
      todayOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({
        where: {
          status: { in: ['SOURCING', 'CONSTRUCTION', 'QUALITY_CHECK'] },
        },
      }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalOrders,
        byStatus: {
          pending: pendingOrders,
          inProduction: inProductionOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
        },
        newToday: todayOrders,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Parallel fetch all stats
    const [
      totalRevenue,
      totalOrders,
      totalUsers,
      activeDesigners,
      newUsersToday,
      newOrdersToday,
      revenueThisMonth,
      pendingOrders,
      statusDistribution,
    ] = await Promise.all([
      // Total revenue
      prisma.order.aggregate({
        _sum: { platformFee: true },
        where: { platformFee: { not: null } },
      }),
      // Total orders
      prisma.order.count(),
      // Total users
      prisma.user.count(),
      // Active designers (with at least one design)
      prisma.user.count({
        where: {
          role: 'DESIGNER',
          designs: { some: {} },
        },
      }),
      // New users today
      prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      // New orders today
      prisma.order.count({
        where: { createdAt: { gte: today } },
      }),
      // Revenue this month
      prisma.order.aggregate({
        _sum: { platformFee: true },
        where: {
          platformFee: { not: null },
          createdAt: { gte: thisMonthStart },
        },
      }),
      // Pending orders
      prisma.order.count({
        where: { status: 'PENDING' },
      }),
      // Order status distribution
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenue: {
          total: totalRevenue._sum.platformFee || 0,
          thisMonth: revenueThisMonth._sum.platformFee || 0,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          newToday: newOrdersToday,
        },
        users: {
          total: totalUsers,
          designers: activeDesigners,
          newToday: newUsersToday,
        },
        statusDistribution: statusDistribution.map((item) => ({
          status: item.status,
          count: item._count,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
};
