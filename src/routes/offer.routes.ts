import { Router } from 'express';
import * as offerController from '../controllers/offer.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer routes
router.post('/', requireRole('CUSTOMER'), offerController.createOffer);
router.delete('/:id/withdraw', requireRole('CUSTOMER'), offerController.withdrawOffer);

// Designer routes
router.put('/:id/accept', requireRole('DESIGNER'), offerController.acceptOffer);
router.put('/:id/counter', requireRole('DESIGNER'), offerController.counterOffer);
router.put('/:id/reject', requireRole('DESIGNER'), offerController.rejectOffer);

// Shared routes (both customer and designer can view)
router.get('/', offerController.getOffers);
router.get('/:id', offerController.getOfferById);

export default router;
