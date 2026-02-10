import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PayoutService } from '../services/payout.service';

const prisma = new PrismaClient();
const payoutService = new PayoutService();

function getAuthenticatedUserId(req: Request): string | null {
  const userId = (req as any).userId ?? (req as any).user?.id ?? (req as any).user?.userId;
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
}

/**
 * POST /api/payouts/lookup
 * Validate bank account and get account name
 */
export async function lookupBankAccount(req: Request, res: Response) {
  try {
    const { bankCode, accountNumber } = req.body;

    if (!bankCode || !accountNumber) {
      return res.status(400).json({
        error: 'Bank code and account number are required',
      });
    }

    // Validate account number format (10 digits for Nigerian banks)
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({
        error: 'Account number must be 10 digits',
      });
    }

    const result = await payoutService.lookupBankAccount(bankCode, accountNumber);

    res.json({
      success: true,
      accountName: result.accountName,
    });
  } catch (error: any) {
    console.error('Bank lookup error:', error);
    res.status(400).json({
      error: error.message || 'Failed to verify bank account',
    });
  }
}

/**
 * POST /api/payouts/bank-setup
 * Save or update user's bank account details
 */
export async function setupBankAccount(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { accountNumber, accountName, bankName, bankCode } = req.body;

    if (!accountNumber || !accountName || !bankName || !bankCode) {
      return res.status(400).json({
        error: 'All bank details are required',
      });
    }

    // Validate account number format
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({
        error: 'Account number must be 10 digits',
      });
    }

    // Verify account with Interswitch before saving
    try {
      const lookupResult = await payoutService.lookupBankAccount(bankCode, accountNumber);

      // Check if the returned name matches (basic validation)
      // You might want to do fuzzy matching in production
      if (!lookupResult.accountName) {
        return res.status(400).json({
          error: 'Failed to verify bank account',
        });
      }
    } catch (error: any) {
      return res.status(400).json({
        error: 'Failed to verify bank account. Please check your details and try again.',
      });
    }

    // Update user's bank details
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        accountNumber,
        accountName,
        bankName,
        bankCode,
        accountVerified: true,
      },
      select: {
        id: true,
        accountNumber: true,
        accountName: true,
        bankName: true,
        bankCode: true,
        accountVerified: true,
      },
    });

    res.json({
      success: true,
      message: 'Bank account details saved successfully',
      bankDetails: user,
    });
  } catch (error: any) {
    console.error('Bank setup error:', error);
    res.status(500).json({
      error: error.message || 'Failed to save bank details',
    });
  }
}

/**
 * GET /api/payouts/bank-details
 * Get user's saved bank account details
 */
export async function getBankDetails(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        accountNumber: true,
        accountName: true,
        bankName: true,
        bankCode: true,
        accountVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      bankDetails: user,
    });
  } catch (error: any) {
    console.error('Get bank details error:', error);
    res.status(500).json({
      error: 'Failed to retrieve bank details',
    });
  }
}

/**
 * POST /api/payouts/request
 * Request a withdrawal
 */
export async function requestWithdrawal(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Valid amount is required',
      });
    }

    // Check if user has a designer role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'DESIGNER') {
      return res.status(403).json({
        error: 'Only designers can request withdrawals',
      });
    }

    const payout = await payoutService.createPayout(userId, amount);

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      payout: {
        id: payout.id,
        amount: payout.amount,
        fee: payout.fee,
        netAmount: payout.netAmount,
        status: payout.status,
        transactionReference: payout.transactionReference,
        recipientBank: payout.recipientBank,
        recipientAccount: payout.recipientAccount,
        recipientName: payout.recipientName,
        createdAt: payout.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Withdrawal request error:', error);
    res.status(400).json({
      error: error.message || 'Failed to process withdrawal request',
    });
  }
}

/**
 * GET /api/payouts
 * Get user's payout history
 */
export async function getPayoutHistory(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await payoutService.getUserPayouts(userId, limit, offset);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Get payout history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve payout history',
    });
  }
}

/**
 * GET /api/payouts/:id
 * Get specific payout details
 */
export async function getPayoutDetails(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;

    const payout = await payoutService.getPayoutById(id, userId);

    res.json({
      success: true,
      payout,
    });
  } catch (error: any) {
    console.error('Get payout details error:', error);
    res.status(404).json({
      error: error.message || 'Payout not found',
    });
  }
}

/**
 * GET /api/payouts/:transactionReference/status
 * Check payout status and update if needed
 */
export async function checkPayoutStatus(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { transactionReference } = req.params;

    // Verify the payout belongs to this user
    const payout = await prisma.payout.findUnique({
      where: { transactionReference },
    });

    if (!payout || payout.userId !== userId) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    // Update status from Interswitch
    const updatedPayout = await payoutService.updatePayoutStatus(transactionReference);

    res.json({
      success: true,
      payout: updatedPayout,
    });
  } catch (error: any) {
    console.error('Check payout status error:', error);
    res.status(500).json({
      error: error.message || 'Failed to check payout status',
    });
  }
}

/**
 * POST /api/payouts/webhook
 * Handle Interswitch webhook notifications
 */
export async function handlePayoutWebhook(req: Request, res: Response) {
  try {
    // TODO: Add webhook signature verification for security
    const payload = req.body;

    console.log('Received payout webhook:', payload);

    await payoutService.handleWebhook(payload);

    res.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent webhook retries
    res.json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /api/payouts/wallet/balance
 * Get Interswitch wallet balance (admin/debugging)
 */
export async function getWalletBalance(req: Request, res: Response) {
  try {
    const balance = await payoutService.getWalletBalance();

    res.json({
      success: true,
      balance,
    });
  } catch (error: any) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      error: 'Failed to retrieve wallet balance',
    });
  }
}
