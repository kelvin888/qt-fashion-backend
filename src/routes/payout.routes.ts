import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as payoutController from '../controllers/payout.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Bank Account Management
 */

// Lookup/verify bank account
router.post('/lookup', payoutController.lookupBankAccount);

// Save/update bank account details
router.post('/bank-setup', payoutController.setupBankAccount);

// Get saved bank account details
router.get('/bank-details', payoutController.getBankDetails);

/**
 * Withdrawal/Payout Operations
 */

// Request a withdrawal
router.post('/request', payoutController.requestWithdrawal);

// Get payout history
router.get('/', payoutController.getPayoutHistory);

// Get specific payout details
router.get('/:id', payoutController.getPayoutDetails);

// Check payout status (manually refresh from Interswitch)
router.get('/:transactionReference/status', payoutController.checkPayoutStatus);

/**
 * Webhook & Admin
 */

// Webhook endpoint (no auth required - handled in controller)
router.post('/webhook', payoutController.handlePayoutWebhook);

// Get Interswitch wallet balance (for monitoring)
router.get('/wallet/balance', payoutController.getWalletBalance);

export default router;
