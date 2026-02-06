import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  initiatePayment,
  verifyPayment,
  handleWebhook,
  getPaymentByRef,
} from '../controllers/payment.controller';

const router = Router();

/**
 * @route   POST /api/payments/initiate
 * @desc    Initiate payment for an accepted offer
 * @access  Private (Customer)
 */
router.post('/initiate', authenticate, initiatePayment);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment and create order
 * @access  Private (Customer)
 */
router.post('/verify', authenticate, verifyPayment);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Interswitch webhook notifications
 * @access  Public (Webhook)
 */
router.post('/webhook', handleWebhook);

/**
 * @route   GET /api/payments/:txnRef
 * @desc    Get payment transaction by reference
 * @access  Private
 */
router.get('/:txnRef', authenticate, getPaymentByRef);

export default router;
