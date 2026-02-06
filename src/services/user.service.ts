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

  /**
   * Create body measurement with mocked AI values
   */
  async createBodyMeasurement(data: { userId: string; frontPhoto: string; sidePhoto?: string }) {
    // First, deactivate all existing measurements for this user
    await prisma.bodyMeasurement.updateMany({
      where: { userId: data.userId },
      data: { isActive: false },
    });

    // Mock measurement values (will be replaced with actual AI processing later)
    const mockedMeasurements = {
      chest: Math.round(85 + Math.random() * 20), // 85-105 cm
      waist: Math.round(70 + Math.random() * 20), // 70-90 cm
      hips: Math.round(90 + Math.random() * 20), // 90-110 cm
      height: Math.round(160 + Math.random() * 30), // 160-190 cm
      shoulder: Math.round(40 + Math.random() * 10), // 40-50 cm
      armLength: Math.round(55 + Math.random() * 15), // 55-70 cm
      inseam: Math.round(70 + Math.random() * 20), // 70-90 cm
      neck: Math.round(35 + Math.random() * 10), // 35-45 cm
      aiConfidenceScore: 0.85 + Math.random() * 0.1, // 85-95%
      aiMetadata: {
        processingTime: '2.3s',
        model: 'mock-ai-v1',
        timestamp: new Date().toISOString(),
      },
    };

    // Create new measurement record
    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: data.userId,
        frontPhoto: data.frontPhoto,
        sidePhoto: data.sidePhoto,
        ...mockedMeasurements,
        isActive: true,
      },
    });

    return measurement;
  }
}

export default new UserService();
