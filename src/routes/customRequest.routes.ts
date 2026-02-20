import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createCustomRequest,
  getAllCustomRequests,
  getMyCustomRequests,
  getCustomRequestById,
  updateCustomRequest,
  submitBid,
  updateBid,
  withdrawBid,
  getBidsForRequest,
  acceptBid,
  getMyBids,
} from '../controllers/customRequest.controller';

const router = Router();

// Custom Requests routes
router.post('/', authenticate, createCustomRequest);
router.get('/', authenticate, getAllCustomRequests);
router.get('/my-requests', authenticate, getMyCustomRequests);
router.get('/my-bids', authenticate, getMyBids);
router.get('/:id', authenticate, getCustomRequestById);
router.patch('/:id', authenticate, updateCustomRequest);

// Bidding routes
router.post('/:id/bids', authenticate, submitBid);
router.patch('/:requestId/bids/:bidId', authenticate, updateBid);
router.delete('/:requestId/bids/:bidId', authenticate, withdrawBid);
router.get('/:id/bids', authenticate, getBidsForRequest);
router.post('/:requestId/bids/:bidId/accept', authenticate, acceptBid);

export default router;
