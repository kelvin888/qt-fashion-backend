import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * @swagger
 * /api/uploads/image:
 *   post:
 *     tags:
 *       - Uploads
 *     summary: Upload a single image
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpg, png, gif, webp)
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Cloudinary URL of uploaded image
 *                 publicId:
 *                   type: string
 *                   description: Cloudinary public ID
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/image',
  authenticate,
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file as any;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded',
        });
      }

      // Cloudinary URL is available at file.path (set by multer-storage-cloudinary)
      const cloudinaryUrl = file.path;
      const publicId = file.filename;

      res.json({
        success: true,
        url: cloudinaryUrl,
        publicId: publicId,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/uploads/images:
 *   post:
 *     tags:
 *       - Uploads
 *     summary: Upload multiple images (up to 10)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 urls:
 *                   type: array
 *                   items:
 *                     type: string
 *                 count:
 *                   type: number
 *       400:
 *         description: No files uploaded
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/images',
  authenticate,
  upload.array('images', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as any[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files uploaded',
        });
      }

      // Extract Cloudinary URLs from uploaded files
      const urls = files.map((file) => file.path);

      res.json({
        success: true,
        urls,
        count: urls.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
