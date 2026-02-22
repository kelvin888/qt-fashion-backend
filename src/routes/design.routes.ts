import { Router } from 'express';
import * as designController from '../controllers/design.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireVerifiedAccount } from '../middleware/verifyAccount.middleware';

const router = Router();

/**
 * @swagger
 * /api/designs:
 *   get:
 *     tags:
 *       - Designs
 *     summary: Browse design catalogue (public)
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: designerId
 *         schema:
 *           type: string
 *         description: Filter by designer ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of designs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 designs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Design'
 *                 pagination:
 *                   type: object
 */
router.get('/', designController.getDesigns);

/**
 * @swagger
 * /api/designs/{id}/related:
 *   get:
 *     tags:
 *       - Designs
 *     summary: Get related designs (public)
 *     description: Returns designs similar to the specified design based on category, price, fabric type, and colors
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *         description: Number of related designs to return
 *     responses:
 *       200:
 *         description: List of related designs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Design'
 *       404:
 *         description: Design not found
 */
router.get('/:id/related', designController.getRelatedDesigns);

/**
 * @swagger
 * /api/designs/{id}:
 *   get:
 *     tags:
 *       - Designs
 *     summary: View a specific design
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design ID
 *     responses:
 *       200:
 *         description: Design details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Design'
 *       404:
 *         description: Design not found
 */
router.get('/:id', designController.getDesignById);

/**
 * @swagger
 * /api/designs:
 *   post:
 *     tags:
 *       - Designs
 *     summary: Upload a new design (Designer only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - price
 *               - images
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *               fabricType:
 *                 type: string
 *               colors:
 *                 type: array
 *                 items:
 *                   type: string
 *               sizes:
 *                 type: array
 *                 items:
 *                   type: string
 *               customizable:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Design created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Designer role required
 */
router.post(
  '/',
  authenticate,
  requireRole('DESIGNER'),
  requireVerifiedAccount,
  designController.createDesign
);

/**
 * @swagger
 * /api/designs/{id}:
 *   put:
 *     tags:
 *       - Designs
 *     summary: Update design (Designer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Design updated
 *       403:
 *         description: Not authorized
 */
router.put(
  '/:id',
  authenticate,
  requireRole('DESIGNER'),
  requireVerifiedAccount,
  designController.updateDesign
);

/**
 * @swagger
 * /api/designs/{id}:
 *   delete:
 *     tags:
 *       - Designs
 *     summary: Delete design (Designer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Design deleted
 *       403:
 *         description: Not authorized
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('DESIGNER'),
  requireVerifiedAccount,
  designController.deleteDesign
);

/**
 * @swagger
 * /api/designs/meta/designers:
 *   get:
 *     tags:
 *       - Designs
 *     summary: Get all designers (public)
 *     responses:
 *       200:
 *         description: List of designers
 */
router.get('/meta/designers', designController.getDesigners);

export default router;
