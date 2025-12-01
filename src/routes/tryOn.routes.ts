import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import tryOnService from '../services/tryOn.service';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { promisify } from 'util';
import { pipeline } from 'stream';
import os from 'os';

const router = Router();
const streamPipeline = promisify(pipeline);

/**
 * Download image from URL to temporary file
 */
async function downloadImageFromUrl(imageUrl: string): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(
    tempDir,
    `tryon-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  );

  const response = await axios.get(imageUrl, { responseType: 'stream' });
  await streamPipeline(response.data, fs.createWriteStream(tempFile));

  return tempFile;
}

/**
 * Virtual Try-On Endpoint (with URL support)
 * POST /api/try-on
 * Body: JSON with { userImageUrl, garmentImageUrl } OR multipart/form-data with 'userImage' and 'garmentImage'
 */
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'userImage', maxCount: 1 },
    { name: 'garmentImage', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const tempFiles: string[] = [];

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let userImagePath: string;
      let garmentImagePath: string;

      // Check if URLs are provided in body (JSON request)
      if (req.body.userImageUrl && req.body.garmentImageUrl) {
        console.log('🎨 Processing virtual try-on with URLs...');
        console.log('👤 User image URL:', req.body.userImageUrl);
        console.log('👗 Garment image URL:', req.body.garmentImageUrl);

        // Download images to temp files
        userImagePath = await downloadImageFromUrl(req.body.userImageUrl);
        garmentImagePath = await downloadImageFromUrl(req.body.garmentImageUrl);

        tempFiles.push(userImagePath, garmentImagePath);

        console.log('✅ Images downloaded successfully');
      } else if (files && files.userImage && files.garmentImage) {
        // Handle file uploads - Cloudinary already stored them
        console.log('🎨 Processing virtual try-on with uploaded files...');
        userImagePath = (files.userImage[0] as any).path; // Cloudinary URL
        garmentImagePath = (files.garmentImage[0] as any).path; // Cloudinary URL

        // Download from Cloudinary to temp files for AI processing
        userImagePath = await downloadImageFromUrl(userImagePath);
        garmentImagePath = await downloadImageFromUrl(garmentImagePath);

        tempFiles.push(userImagePath, garmentImagePath);

        console.log('👤 User image:', path.basename(userImagePath));
        console.log('👗 Garment image:', path.basename(garmentImagePath));
      } else {
        return res.status(400).json({
          success: false,
          message:
            'Either provide userImageUrl and garmentImageUrl in JSON body, or upload userImage and garmentImage files',
        });
      }

      // Process with AI
      const result = await tryOnService.tryOnOutfit(userImagePath, garmentImagePath);

      // Clean up temp files
      tempFiles.forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn('⚠️ Failed to delete temp file:', filePath);
        }
      });

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
      tempFiles.forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          // Ignore cleanup errors
        }
      });

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
