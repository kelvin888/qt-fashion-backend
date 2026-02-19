import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import orderService from '../services/order.service';

/**
 * Initiate payment for an accepted offer
 * POST /api/payments/initiate
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { offerId, addressId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!offerId || !addressId) {
      return res.status(400).json({
        error: 'Offer ID and Address ID are required',
      });
    }

    const checkoutParams = await paymentService.initiatePayment(offerId, addressId, userId);

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: checkoutParams,
    });
  } catch (error: any) {
    console.error('Error initiating payment:', error);
    res.status(400).json({
      error: error.message || 'Failed to initiate payment',
    });
  }
};

/**
 * Verify payment and create order if successful
 * POST /api/payments/verify
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { txnRef, addressId, payRef, isSimulated } = req.body;
    const userId = req.user?.id;

    // Log incoming request
    console.log('[Payment Verify] Incoming request:', {
      txnRef,
      addressId,
      payRef,
      isSimulated,
      userId,
      hasAuth: !!req.user,
      timestamp: new Date().toISOString(),
    });

    if (!userId) {
      console.log('[Payment Verify] Authentication failed - no userId');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!txnRef || !addressId) {
      console.log('[Payment Verify] Validation failed - missing required fields:', {
        hasTxnRef: !!txnRef,
        hasAddressId: !!addressId,
        txnRef,
        addressId,
      });
      return res.status(400).json({
        error: 'Transaction reference and Address ID are required',
      });
    }

    // Verify the payment transaction
    const verificationResult = await paymentService.verifyTransaction(
      txnRef,
      userId,
      payRef,
      isSimulated
    );

    // If payment is successful and no order exists yet, create the order
    if (verificationResult.success && !verificationResult.payment.orderId) {
      console.log('[Payment Verify] Payment successful, creating order:', {
        paymentId: verificationResult.payment.id,
        addressId,
        txnRef,
      });

      try {
        const order = await orderService.createOrderFromPayment(
          verificationResult.payment.id,
          addressId
        );

        console.log('[Payment Verify] Order created successfully:', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentId: verificationResult.payment.id,
        });

        return res.status(200).json({
          success: true,
          message: 'Payment verified and order created successfully',
          data: {
            payment: verificationResult.payment,
            order,
          },
        });
      } catch (orderError: any) {
        console.error('[Payment Verify] Error creating order after payment:', {
          message: orderError.message,
          name: orderError.name,
          stack: orderError.stack,
          paymentId: verificationResult.payment.id,
          addressId,
          txnRef,
        });
        // Payment succeeded but order creation failed
        return res.status(500).json({
          success: true,
          paymentVerified: true,
          orderCreated: false,
          message: 'Payment verified but order creation failed',
          error: orderError.message,
          data: {
            payment: verificationResult.payment,
          },
        });
      }
    }

    // Payment verification result (pending, failed, or cancelled)
    res.status(verificationResult.success ? 200 : 400).json({
      success: verificationResult.success,
      message: verificationResult.message,
      responseCode: verificationResult.responseCode,
      data: {
        payment: verificationResult.payment,
        canRetry: verificationResult.payment.retriesCount < 3,
      },
    });
  } catch (error: any) {
    console.error('[Payment Verify] Error occurred:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      txnRef: req.body?.txnRef,
      addressId: req.body?.addressId,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json({
      error: error.message || 'Failed to verify payment',
    });
  }
};

/**
 * Handle webhook from Interswitch
 * POST /api/payments/webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    // Process the webhook
    const result = await paymentService.handleWebhook(payload);

    // If payment is successful, try to create order
    if (
      result.processed &&
      result.payment &&
      result.payment.status === 'SUCCESSFUL' &&
      !result.payment.orderId
    ) {
      // Find the address from the payment context
      // Note: You might need to store addressId in payment transaction for webhooks
      console.log('Webhook: Payment successful but order not created yet');
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      error: error.message || 'Failed to process webhook',
    });
  }
};

/**
 * Get payment transaction by reference
 * GET /api/payments/:txnRef
 */
export const getPaymentByRef = async (req: Request, res: Response) => {
  try {
    const { txnRef } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payment = await paymentService.verifyTransaction(txnRef, userId);

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    res.status(400).json({
      error: error.message || 'Failed to fetch payment',
    });
  }
};
