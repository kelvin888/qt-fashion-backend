import { Router } from 'express';
import {
  getUserById,
  getDesignerProfile,
  getUserMeasurements,
  getMyMeasurements,
  getActiveMeasurement,
  createBodyMeasurement,
  updateProfile,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Authenticated user's own measurements (no ID needed) - MUST be before /:id routes
router.get('/measurements', authenticate, getMyMeasurements);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               brandName:
 *                 type: string
 *                 description: For designers only
 *               brandLogo:
 *                 type: string
 *                 description: URL of brand logo
 *               brandBanner:
 *                 type: string
 *                 description: URL of brand banner
 *               bio:
 *                 type: string
 *                 description: User/designer biography
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/profile', authenticate, updateProfile);

// Public routes - anyone can view user profiles
router.get('/:id', getUserById);
router.get('/:id/designer-profile', getDesignerProfile);

/**
 * @swagger
 * /api/users/{id}/measurements:
 *   get:
 *     summary: Get all measurements for a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User measurements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/:id/measurements', authenticate, getUserMeasurements);

/**
 * @swagger
 * /api/users/{id}/measurements/active:
 *   get:
 *     summary: Get active measurement for a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Active measurement retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/:id/measurements/active', authenticate, getActiveMeasurement);

/**
 * @swagger
 * /api/users/measurements:
 *   post:
 *     summary: Create body measurement (mocked AI processing)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - frontPhoto
 *             properties:
 *               frontPhoto:
 *                 type: string
 *               sidePhoto:
 *                 type: string
 *     responses:
 *       201:
 *         description: Measurement created successfully
 */
router.post('/measurements', authenticate, createBodyMeasurement);

export default router;
