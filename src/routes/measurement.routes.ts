import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  createMeasurement,
  getMeasurements,
  getActiveMeasurement,
  updateMeasurement,
  deleteMeasurement,
  setActiveMeasurement,
} from '../controllers/measurement.controller';

const router = Router();

/**
 * @swagger
 * /api/measurements:
 *   post:
 *     tags:
 *       - Measurements
 *     summary: Create new measurement
 *     description: Create a new body measurement with AI-powered photo analysis
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               frontPhoto:
 *                 type: string
 *                 format: binary
 *                 description: Front view photo of body
 *               sidePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Side view photo of body
 *               height:
 *                 type: number
 *                 example: 170
 *               weight:
 *                 type: number
 *                 example: 65
 *               chest:
 *                 type: number
 *                 example: 92
 *               waist:
 *                 type: number
 *                 example: 75
 *               hips:
 *                 type: number
 *                 example: 95
 *               inseam:
 *                 type: number
 *                 example: 80
 *               shoulder:
 *                 type: number
 *                 example: 42
 *     responses:
 *       201:
 *         description: Measurement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 measurement:
 *                   $ref: '#/components/schemas/Measurement'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'sidePhoto', maxCount: 1 },
  ]),
  createMeasurement
);

/**
 * @swagger
 * /api/measurements:
 *   get:
 *     tags:
 *       - Measurements
 *     summary: Get all measurements
 *     description: Retrieve all measurements for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Measurements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 measurements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Measurement'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, getMeasurements);

/**
 * @swagger
 * /api/measurements/active:
 *   get:
 *     tags:
 *       - Measurements
 *     summary: Get active measurement
 *     description: Retrieve the currently active measurement for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active measurement retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 measurement:
 *                   $ref: '#/components/schemas/Measurement'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active measurement found
 *       500:
 *         description: Server error
 */
router.get('/active', authenticate, getActiveMeasurement);

/**
 * @swagger
 * /api/measurements/{id}:
 *   put:
 *     tags:
 *       - Measurements
 *     summary: Update measurement
 *     description: Update an existing measurement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Measurement ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               frontPhoto:
 *                 type: string
 *                 format: binary
 *               sidePhoto:
 *                 type: string
 *                 format: binary
 *               height:
 *                 type: number
 *               weight:
 *                 type: number
 *               chest:
 *                 type: number
 *               waist:
 *                 type: number
 *               hips:
 *                 type: number
 *               inseam:
 *                 type: number
 *               shoulder:
 *                 type: number
 *     responses:
 *       200:
 *         description: Measurement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 measurement:
 *                   $ref: '#/components/schemas/Measurement'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Measurement not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  authenticate,
  upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'sidePhoto', maxCount: 1 },
  ]),
  updateMeasurement
);

/**
 * @swagger
 * /api/measurements/{id}:
 *   delete:
 *     tags:
 *       - Measurements
 *     summary: Delete measurement
 *     description: Delete a measurement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Measurement ID
 *     responses:
 *       200:
 *         description: Measurement deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Measurement not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, deleteMeasurement);

/**
 * @swagger
 * /api/measurements/{id}/activate:
 *   patch:
 *     tags:
 *       - Measurements
 *     summary: Set active measurement
 *     description: Set a measurement as the active measurement for try-on
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Measurement ID
 *     responses:
 *       200:
 *         description: Measurement set as active successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 measurement:
 *                   $ref: '#/components/schemas/Measurement'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Measurement not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/activate', authenticate, setActiveMeasurement);

export default router;
