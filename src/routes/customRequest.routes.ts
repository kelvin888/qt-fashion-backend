import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createCustomRequest,
  getAllCustomRequests,
  getMyCustomRequests,
  getCustomRequestById,
  updateCustomRequest,
  submitBid,
  getBidsForRequest,
  acceptBid,
  getMyBids,
} from '../controllers/customRequest.controller';

const router = Router();

// Custom Requests routes
router.post('/', authMiddleware, createCustomRequest);
router.get('/', authMiddleware, getAllCustomRequests);
router.get('/my-requests', authMiddleware, getMyCustomRequests);
router.get('/my-bids', authMiddleware, getMyBids);
router.get('/:id', authMiddleware, getCustomRequestById);
router.patch('/:id', authMiddleware, updateCustomRequest);

// Bidding routes
router.post('/:id/bids', authMiddleware, submitBid);
router.get('/:id/bids', authMiddleware, getBidsForRequest);
router.post('/:requestId/bids/:bidId/accept', authMiddleware, acceptBid);

export default router;
