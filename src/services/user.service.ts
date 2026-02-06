import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class UserService {
  /**
   * Get public user profile by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        role: true,
        profileImage: true,
        brandName: true,
        brandLogo: true,
        brandBanner: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Get designer profile with stats
   */
  async getDesignerProfile(designerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: designerId },
      select: {
        id: true,
        fullName: true,
        role: true,
        profileImage: true,
        brandName: true,
        brandLogo: true,
        brandBanner: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('Designer not found');
    }

    if (user.role !== 'DESIGNER') {
      throw new Error('User is not a designer');
    }

    // Get designer's designs count
    const designCount = await prisma.design.count({
      where: { designerId },
    });

    // Get accepted offers count (completed orders)
    const completedOrders = await prisma.offer.count({
      where: {
        designerId,
        status: 'ACCEPTED',
      },
    });

    return {
      ...user,
      stats: {
        designCount,
        completedOrders,
      },
    };
  }

  /**
   * Get user's body measurements
   */
  async getUserMeasurements(userId: string) {
    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return measurements;
  }

  /**
   * Get user's active measurement
   */
  async getActiveMeasurement(userId: string) {
    const measurement = await prisma.bodyMeasurement.findFirst({
      where: { 
        userId,
        isActive: true,
      },
    });

    return measurement;
  }
}

export default new UserService();
