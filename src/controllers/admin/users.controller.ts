/**
 * Admin Users Controller
 * Handles user management operations (admin only)
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';

/**
 * Get all users with filters and pagination
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { phoneNumber: { contains: search as string } },
        { brandName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          role: true,
          brandName: true,
          profileImage: true,
          walletBalance: true,
          accountVerified: true,
          createdAt: true,
          _count: {
            select: {
              designs: true,
              ordersAsCustomer: true,
              ordersAsDesigner: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate stats for each user
    const usersWithStats = users.map((user) => ({
      ...user,
      stats: {
        designsCount: user._count.designs,
        ordersAsCustomer: user._count.ordersAsCustomer,
        ordersAsDesigner: user._count.ordersAsDesigner,
        totalOrders: user._count.ordersAsCustomer + user._count.ordersAsDesigner,
      },
      _count: undefined, // Remove _count from response
    }));

    res.status(200).json({
      success: true,
      data: {
        users: usersWithStats,
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
 * Get user details by ID
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        designs: {
          select: {
            id: true,
            title: true,
            category: true,
            price: true,
            images: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        ordersAsCustomer: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            finalPrice: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        ordersAsDesigner: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            finalPrice: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            designs: true,
            ordersAsCustomer: true,
            ordersAsDesigner: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, customerCount, designerCount, adminCount, newUsersToday] = await Promise.all(
      [
        prisma.user.count(),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.count({ where: { role: 'DESIGNER' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]
    );

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        byRole: {
          customers: customerCount,
          designers: designerCount,
          admins: adminCount,
        },
        newToday: newUsersToday,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Update user account status (suspend/activate)
 */
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { accountVerified, reason } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { accountVerified },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountVerified: true,
      },
    });

    console.log(
      `⚙️ User ${id} status updated by admin: ${accountVerified ? 'Activated' : 'Suspended'}`,
      {
        reason,
        adminId: req.user!.id,
      }
    );

    res.status(200).json({
      success: true,
      message: `User ${accountVerified ? 'activated' : 'suspended'} successfully`,
      data: user,
    });
  } catch (error: any) {
    next(error);
  }
};
