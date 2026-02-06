import { Router } from 'express';
import { getUserById, getDesignerProfile, getUserMeasurements, getActiveMeasurement } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

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

export default router;
