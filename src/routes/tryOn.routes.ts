import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import tryOnService from '../services/tryOn.service';
import path from 'path';
import fs from 'fs';

const router = Router();

/**
 * Virtual Try-On Endpoint
 * POST /api/try-on
 * Body: multipart/form-data with 'userImage' and 'garmentImage'
 */
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'userImage', maxCount: 1 },
    { name: 'garmentImage', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Validate uploads
      if (!files || !files.userImage || !files.garmentImage) {
        return res.status(400).json({
          success: false,
          message: 'Both userImage and garmentImage are required',
        });
      }

      const userImagePath = files.userImage[0].path;
      const garmentImagePath = files.garmentImage[0].path;

      console.log('🎨 Processing virtual try-on request...');
      console.log('👤 User image:', path.basename(userImagePath));
      console.log('👗 Garment image:', path.basename(garmentImagePath));

      // Process with AI
      const result = await tryOnService.tryOnOutfit(userImagePath, garmentImagePath);

      // Clean up uploaded files
      fs.unlinkSync(userImagePath);
      fs.unlinkSync(garmentImagePath);

      if (result.success) {
        console.log(`✅ Try-on completed in ${result.processingTime}ms using ${result.provider}`);
        return res.json({
          success: true,
          data: {
            imageUrl: result.imageUrl,
            provider: result.provider,
            processingTime: result.processingTime,
          },
        });
      } else {
        console.error('❌ Try-on failed:', result.error);
        return res.status(500).json({
          success: false,
          message: result.error || 'Try-on failed',
        });
      }
    } catch (error: any) {
      console.error('❌ Try-on route error:', error);

      // Clean up files on error
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files?.userImage?.[0]?.path) fs.unlinkSync(files.userImage[0].path);
        if (files?.garmentImage?.[0]?.path) fs.unlinkSync(files.garmentImage[0].path);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Virtual try-on failed',
      });
    }
  }
);

/**
 * Get usage stats
 * GET /api/try-on/stats
 */
router.get('/stats', authenticate, (req: Request, res: Response) => {
  const stats = tryOnService.getUsageStats();
  res.json({
    success: true,
    data: stats,
  });
});

export default router;
