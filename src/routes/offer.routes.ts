import { Router } from 'express';
import * as offerController from '../controllers/offer.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireVerifiedAccount } from '../middleware/verifyAccount.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/offers:
 *   post:
 *     tags:
 *       - Offers
 *     summary: Send offer/negotiate price (Customer only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - designId
 *               - customerPrice
 *             properties:
 *               designId:
 *                 type: string
 *               designerId:
 *                 type: string
 *               customerPrice:
 *                 type: number
 *               notes:
 *                 type: string
 *               measurements:
 *                 type: object
 *     responses:
 *       201:
 *         description: Offer created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Customer role required
 */
router.post('/', requireRole('CUSTOMER'), offerController.createOffer);

/**
 * @swagger
 * /api/offers/{id}/withdraw:
 *   delete:
 *     tags:
 *       - Offers
 *     summary: Withdraw offer (Customer only)
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
 *         description: Offer withdrawn
 *       403:
 *         description: Not authorized
 */
router.delete('/:id/withdraw', requireRole('CUSTOMER'), offerController.withdrawOffer);

/**
 * @swagger
 * /api/offers/{id}/accept:
 *   put:
 *     tags:
 *       - Offers
 *     summary: Accept customer offer (Designer only)
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
 *         description: Offer accepted
 *       403:
 *         description: Designer role required
 */
router.put(
  '/:id/accept',
  requireRole('DESIGNER'),
  requireVerifiedAccount,
  offerController.acceptOffer
);

/**
 * @swagger
 * /api/offers/{id}/counter:
 *   put:
 *     tags:
 *       - Offers
 *     summary: Counter offer with new price (Designer only)
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
 *             required:
 *               - designerPrice
 *             properties:
 *               designerPrice:
 *                 type: number
 *               designerNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Counter offer sent
 *       403:
 *         description: Designer role required
 */
router.put(
  '/:id/counter',
  requireRole('DESIGNER'),
  requireVerifiedAccount,
  offerController.counterOffer
);

/**
 * @swagger
 * /api/offers/{id}/reject:
 *   put:
 *     tags:
 *       - Offers
 *     summary: Reject customer offer (Designer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               designerNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Offer rejected
 *       403:
 *         description: Designer role required
 */
router.put(
  '/:id/reject',
  requireRole('DESIGNER'),
  requireVerifiedAccount,
  offerController.rejectOffer
);

/**
 * @swagger
 * /api/offers/{id}/customer-counter:
 *   put:
 *     tags:
 *       - Offers
 *     summary: Customer makes counter offer (Customer only)
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
 *             required:
 *               - customerPrice
 *             properties:
 *               customerPrice:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Counter offer sent
 *       403:
 *         description: Customer role required
 */
router.put('/:id/customer-counter', requireRole('CUSTOMER'), offerController.customerCounterOffer);

/**
 * @swagger
 * /api/offers/{id}/accept-counter:
 *   put:
 *     tags:
 *       - Offers
 *     summary: Customer accepts designer's counter offer (Customer only)
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
 *         description: Counter offer accepted
 *       403:
 *         description: Customer role required
 */
router.put('/:id/accept-counter', requireRole('CUSTOMER'), offerController.acceptCounterOffer);

/**
 * @swagger
 * /api/offers/{id}/decline-counter:
 *   put:
 *     tags:
 *       - Offers
 *     summary: Customer declines designer's counter offer (Customer only)
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
 *         description: Counter offer declined
 *       403:
 *         description: Customer role required
 */
router.put('/:id/decline-counter', requireRole('CUSTOMER'), offerController.declineCounterOffer);

/**
 * @swagger
 * /api/offers:
 *   get:
 *     tags:
 *       - Offers
 *     summary: View customer requests / track orders
 *     description: Customers see their offers, Designers see offers for their designs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of offers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [PENDING, ACCEPTED, REJECTED, COUNTERED, WITHDRAWN, EXPIRED]
 *                   customerPrice:
 *                     type: number
 *                   designerPrice:
 *                     type: number
 *                   finalPrice:
 *                     type: number
 */
router.get('/', offerController.getOffers);

/**
 * @swagger
 * /api/offers/{id}:
 *   get:
 *     tags:
 *       - Offers
 *     summary: Get offer details
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
 *         description: Offer details
 *       404:
 *         description: Offer not found
 */
router.get('/:id', offerController.getOfferById);

/**
 * @swagger
 * /api/offers/{id}/measurements:
 *   get:
 *     tags:
 *       - Offers
 *     summary: Get customer measurements for an offer (Designer/Customer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Offer ID
 *     responses:
 *       200:
 *         description: Customer body measurements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 measurements:
 *                   type: object
 *       404:
 *         description: Offer or measurements not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/measurements', offerController.getOfferMeasurements);

export default router;
