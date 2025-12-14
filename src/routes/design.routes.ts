import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  createDesign,
  getDesigns,
  getDesignById,
  updateDesign,
  deleteDesign,
  getMyDesigns,
} from '../controllers/design.controller';

const router = Router();

/**
 * Public routes
 */

/**
 * @swagger
 * /api/designs:
 *   get:
 *     tags:
 *       - Designs
 *     summary: Get all designs
 *     description: Retrieve a list of all designs with optional filters
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by design category
 *       - in: query
 *         name: designerId
 *         schema:
 *           type: string
 *         description: Filter by designer ID
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by design name or description
 *     responses:
 *       200:
 *         description: List of designs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 designs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Design'
 *       500:
 *         description: Server error
 */
router.get('/', getDesigns);

/**
 * @swagger
 * /api/designs/{id}:
 *   get:
 *     tags:
 *       - Designs
 *     summary: Get design by ID
 *     description: Retrieve a single design by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design ID
 *     responses:
 *       200:
 *         description: Design retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 design:
 *                   $ref: '#/components/schemas/Design'
 *       404:
 *         description: Design not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getDesignById);

/**
 * Designer-only routes
 */

/**
 * @swagger
 * /api/designs/my/designs:
 *   get:
 *     tags:
 *       - Designs
 *     summary: Get my designs
 *     description: Retrieve all designs created by the authenticated designer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Designer's designs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 designs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Design'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a designer
 *       500:
 *         description: Server error
 */
router.get('/my/designs', authenticate, authorize('DESIGNER'), getMyDesigns);

/**
 * @swagger
 * /api/designs:
 *   post:
 *     tags:
 *       - Designs
 *     summary: Create new design
 *     description: Create a new design (Designer only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - category
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Summer Dress Collection
 *               description:
 *                 type: string
 *                 example: Beautiful floral summer dress with modern cut
 *               category:
 *                 type: string
 *                 example: Dresses
 *               price:
 *                 type: number
 *                 example: 99.99
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Design images (max 5)
 *     responses:
 *       201:
 *         description: Design created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 design:
 *                   $ref: '#/components/schemas/Design'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a designer
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, authorize('DESIGNER'), upload.array('images', 5), createDesign);

/**
 * @swagger
 * /api/designs/{id}:
 *   put:
 *     tags:
 *       - Designs
 *     summary: Update design
 *     description: Update an existing design (Designer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Design updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 design:
 *                   $ref: '#/components/schemas/Design'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Design not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, authorize('DESIGNER'), upload.array('images', 5), updateDesign);

/**
 * @swagger
 * /api/designs/{id}:
 *   delete:
 *     tags:
 *       - Designs
 *     summary: Delete design
 *     description: Soft delete a design (Designer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design ID
 *     responses:
 *       200:
 *         description: Design deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Design not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, authorize('DESIGNER'), deleteDesign);

export default router;
