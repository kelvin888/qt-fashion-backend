import { Router } from 'express';
import * as tryOnController from '../controllers/tryOn.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * /api/try-on/generate:
 *   post:
 *     tags:
 *       - Virtual Try-On
 *     summary: Generate virtual try-on image (proxy to external API)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - person_image
 *               - clothing_design
 *             properties:
 *               person_image:
 *                 type: string
 *                 format: binary
 *                 description: Photo of the person
 *               clothing_design:
 *                 type: string
 *                 format: binary
 *                 description: Clothing design image
 *     responses:
 *       200:
 *         description: Try-on generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                     provider:
 *                       type: string
 *                     processingTime:
 *                       type: number
 *       400:
 *         description: Missing required files
 *       401:
 *         description: Unauthorized
 *       504:
 *         description: Try-on service timeout
 */
router.post(
  '/generate',
  authenticate,
  upload.fields([
    { name: 'person_image', maxCount: 1 },
    { name: 'clothing_design', maxCount: 1 },
  ]),
  tryOnController.proxyTryOn
);

/**
 * @swagger
 * /api/try-on/stats:
 *   get:
 *     tags:
 *       - Virtual Try-On
 *     summary: Get try-on usage statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestCount:
 *                       type: number
 *                     maxRequests:
 *                       type: number
 *                     remaining:
 *                       type: number
 */
router.get('/stats', authenticate, tryOnController.getTryOnStats);

export default router;
