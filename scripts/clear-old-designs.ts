/**
 * Migration Script: Clear Old Designs (Pre-Cloudinary)
 * 
 * This script removes all designs that were uploaded before Cloudinary integration.
 * Designers will need to re-upload their designs through the app with Cloudinary support.
 * 
 * Run this script once to clean up the database after Cloudinary migration.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearOldDesigns() {
  try {
    console.log('🗑️  Starting cleanup of pre-Cloudinary designs...');
    console.log('');

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
    console.log('');

    if (oldDesigns.length === 0) {
      console.log('✅ No old designs found. Database is clean!');
      return;
    }

    // Show designs that will be deleted
    console.log('📋 Designs to be deleted:');
    oldDesigns.forEach((design, index) => {
      console.log(`   ${index + 1}. ${design.title} (ID: ${design.id})`);
    });
    console.log('');

    // Delete old designs
    const deleteResult = await prisma.design.deleteMany({
      where: {
        id: {
          in: oldDesigns.map((d) => d.id),
        },
      },
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} old designs`);
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Inform designers to re-upload their designs through the app');
    console.log('   2. New uploads will automatically use Cloudinary');
    console.log('   3. All images will be permanently stored in the cloud');
    console.log('');
    console.log('✨ Database cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
clearOldDesigns()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
