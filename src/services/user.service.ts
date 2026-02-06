import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

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
   * Create body measurement
   */
  async createBodyMeasurement(data: {
    userId: string;
    frontPhoto: string;
    sidePhoto?: string;
    chest: number;
    waist: number;
    hips: number;
    height: number;
    shoulder: number;
    armLength: number;
    inseam: number;
    neck: number;
  }) {
    // Find and delete existing measurements for this user
    const existingMeasurements = await prisma.bodyMeasurement.findMany({
      where: { userId: data.userId },
      select: { id: true, frontPhoto: true, sidePhoto: true },
    });

    // Delete old Cloudinary photos
    if (existingMeasurements.length > 0) {
      console.log(`🗑️  Deleting ${existingMeasurements.length} old measurements and photos`);

      for (const oldMeasurement of existingMeasurements) {
        // Extract and delete Cloudinary images
        try {
          if (oldMeasurement.frontPhoto) {
            const publicId = this.extractCloudinaryPublicId(oldMeasurement.frontPhoto);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
              console.log(`✅ Deleted front photo: ${publicId}`);
            }
          }
          if (oldMeasurement.sidePhoto) {
            const publicId = this.extractCloudinaryPublicId(oldMeasurement.sidePhoto);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
              console.log(`✅ Deleted side photo: ${publicId}`);
            }
          }
        } catch (error) {
          console.error('⚠️  Error deleting Cloudinary photo:', error);
          // Continue even if deletion fails
        }
      }

      // Delete old measurement records from database
      await prisma.bodyMeasurement.deleteMany({
        where: { userId: data.userId },
      });
    }

    // Create new measurement record
    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: data.userId,
        frontPhoto: data.frontPhoto,
        sidePhoto: data.sidePhoto,
        chest: data.chest,
        waist: data.waist,
        hips: data.hips,
        height: data.height,
        shoulder: data.shoulder,
        armLength: data.armLength,
        inseam: data.inseam,
        neck: data.neck,
        aiConfidenceScore: 0.85 + Math.random() * 0.1,
        aiMetadata: {
          processingTime: '2.3s',
          model: 'mock-ai-v1',
          timestamp: new Date().toISOString(),
        },
        isActive: true,
      },
    });

    return measurement;
  }

  /**
   * Extract Cloudinary public ID from URL
   * Example: https://res.cloudinary.com/demo/image/upload/v1234567890/measurements/abc123.jpg -> measurements/abc123
   */
  private extractCloudinaryPublicId(url: string): string | null {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}

export default new UserService();
