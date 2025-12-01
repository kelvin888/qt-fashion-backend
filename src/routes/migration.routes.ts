import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Migration Endpoint: Clear Old Designs (Pre-Cloudinary)
 * DELETE /api/migration/clear-old-designs
 * 
 * This endpoint removes all designs uploaded before Cloudinary integration.
 * Only accessible with admin token for security.
 */
router.delete('/clear-old-designs', async (req: Request, res: Response) => {
  try {
    // Simple auth check - require a secret token
    const authToken = req.headers['x-migration-token'];
    if (authToken !== process.env.MIGRATION_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Invalid migration token.',
      });
    }

    console.log('🗑️  Starting cleanup of pre-Cloudinary designs...');

    // Get all designs
    const allDesigns = await prisma.design.findMany({
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        images: true,
      },
    });

    console.log(`📊 Total designs in database: ${allDesigns.length}`);

    // Filter designs with old local file paths
    const oldDesigns = allDesigns.filter((design) => {
      const thumbnail = design.thumbnailUrl || '';
      const images = design.images || '[]';
      
      // Check if thumbnailUrl or images contain local paths (not Cloudinary)
      const hasLocalThumbnail = thumbnail && !thumbnail.startsWith('https://res.cloudinary.com');
      const hasLocalImages = images.includes('/uploads/') || images.includes('images-');
      
      return hasLocalThumbnail || hasLocalImages;
    });

    console.log(`🔍 Found ${oldDesigns.length} designs with old local file paths`);

    if (oldDesigns.length === 0) {
      return res.json({
        success: true,
        message: 'No old designs found. Database is clean!',
        deleted: 0,
        designs: [],
      });
    }

    const designsList = oldDesigns.map((d) => ({
      id: d.id,
      title: d.title,
      thumbnailUrl: d.thumbnailUrl,
    }));

    // Delete old designs
    const deleteResult = await prisma.design.deleteMany({
      where: {
        id: {
          in: oldDesigns.map((d) => d.id),
        },
      },
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} old designs`);

    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} old designs`,
      deleted: deleteResult.count,
      designs: designsList,
    });

  } catch (error: any) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message,
    });
  }
});

/**
 * Get migration status
 * GET /api/migration/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const allDesigns = await prisma.design.findMany({
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        images: true,
      },
    });

    const oldDesigns = allDesigns.filter((design) => {
      const thumbnail = design.thumbnailUrl || '';
      const images = design.images || '[]';
      
      const hasLocalThumbnail = thumbnail && !thumbnail.startsWith('https://res.cloudinary.com');
      const hasLocalImages = images.includes('/uploads/') || images.includes('images-');
      
      return hasLocalThumbnail || hasLocalImages;
    });

    const cloudinaryDesigns = allDesigns.filter((design) => {
      const thumbnail = design.thumbnailUrl || '';
      return thumbnail.startsWith('https://res.cloudinary.com');
    });

    res.json({
      success: true,
      total: allDesigns.length,
      cloudinary: cloudinaryDesigns.length,
      oldLocalFiles: oldDesigns.length,
      needsMigration: oldDesigns.length > 0,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get migration status',
      error: error.message,
    });
  }
});

export default router;
