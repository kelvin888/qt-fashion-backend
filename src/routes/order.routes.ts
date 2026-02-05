/**
 * Order Routes
 *
 * API endpoints for order management and tracking.
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as orderController from '../controllers/order.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get all orders
 *     description: |
 *       Returns orders for authenticated user.
 *       - Customers see their own orders
 *       - Designers see orders for their designs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   orderNumber:
 *                     type: string
 *                     example: "QT-2024-00001"
 *                   status:
 *                     type: string
 *                     enum: [PENDING, SOURCING, CONSTRUCTION, QUALITY_CHECK, SHIPPING, DELIVERED, CANCELLED]
 *                   finalPrice:
 *                     type: number
 *                   customer:
 *                     type: object
 *                   designer:
 *                     type: object
 *                   design:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', orderController.getOrders);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get order by ID
 *     description: Returns detailed order information including production steps and shipment tracking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 orderNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 finalPrice:
 *                   type: number
 *                 measurements:
 *                   type: object
 *                 productionSteps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       step:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, in_progress, completed]
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                 progressNotes:
 *                   type: string
 *                 carrier:
 *                   type: string
 *                 trackingNumber:
 *                   type: string
 *                 estimatedDelivery:
 *                   type: string
 *                   format: date-time
 *                 deliveredAt:
 *                   type: string
 *                   format: date-time
 *                 customer:
 *                   type: object
 *                 designer:
 *                   type: object
 *                 design:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.get('/:orderId', orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Update order status (Designer only)
 *     description: Designer can update the order status to track progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, SOURCING, CONSTRUCTION, QUALITY_CHECK, SHIPPING, DELIVERED, CANCELLED]
 *               progressNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only designer can update status
 *       404:
 *         description: Order not found
 */
router.patch('/:orderId/status', orderController.updateOrderStatus);

/**
 * @swagger
 * /api/orders/{orderId}/production:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Update production progress (Designer only)
 *     description: Designer can update production steps and add progress notes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               productionSteps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     step:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, in_progress, completed]
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *               progressNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Production updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only designer can update production
 *       404:
 *         description: Order not found
 */
router.patch('/:orderId/production', orderController.updateProduction);

/**
 * @swagger
 * /api/orders/{orderId}/production/steps/{stepId}:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Update single production step (Designer only)
 *     description: Designer updates status of a specific production step
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: The step name (e.g., "Fabric Sourcing")
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Production step updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order or step not found
 */
router.patch('/:orderId/production/steps/:stepId', orderController.updateProductionStep);

/**
 * @swagger
 * /api/orders/{orderId}/shipment:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Add shipment tracking (Designer only)
 *     description: Designer adds shipping details when order is dispatched
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - carrier
 *               - trackingNumber
 *               - estimatedDelivery
 *             properties:
 *               carrier:
 *                 type: string
 *                 example: "DHL Express"
 *               trackingNumber:
 *                 type: string
 *                 example: "1234567890"
 *               estimatedDelivery:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-15T00:00:00Z"
 *     responses:
 *       200:
 *         description: Shipment tracking added
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only designer can add shipment
 *       404:
 *         description: Order not found
 */
router.post('/:orderId/shipment', orderController.addShipment);

/**
 * @swagger
 * /api/orders/{orderId}/confirm-delivery:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Confirm delivery (Customer only)
 *     description: Customer confirms receipt of order and optionally provides rating/review. Releases payment from escrow.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               review:
 *                 type: string
 *                 example: "Beautiful work! Exactly as I envisioned."
 *     responses:
 *       200:
 *         description: Delivery confirmed, payment released
 *       400:
 *         description: Invalid rating or already delivered
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only customer can confirm delivery
 *       404:
 *         description: Order not found
 */
router.post('/:orderId/confirm-delivery', orderController.confirmDelivery);

/**
 * @swagger
 * /api/orders/stats/designer:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get designer order statistics
 *     description: Returns order stats for designer dashboard (total, in progress, completed, revenue)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Designer order statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 confirmed:
 *                   type: number
 *                 inProgress:
 *                   type: number
 *                 completed:
 *                   type: number
 *                 totalRevenue:
 *                   type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/stats/designer', orderController.getDesignerStats);

export default router;
