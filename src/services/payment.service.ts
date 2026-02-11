import { PrismaClient, PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import {
  getPaymentErrorMessage,
  isPaymentSuccessful,
  isPaymentPending,
  isPaymentCancelled,
} from '../utils/payment-error-messages';

const prisma = new PrismaClient();

interface InterswitchCheckoutParams {
  merchant_code: string;
  pay_item_id: string;
  txn_ref: string;
  amount: number; // Amount in kobo (multiply Naira by 100)
  currency: string;
  cust_name: string;
  cust_email: string;
  cust_id: string;
  designer_name: string;
  mode: string;
  site_redirect_url?: string;
}

interface InterswitchVerifyResponse {
  Amount: number;
  CardNumber?: string;
  MerchantReference: string;
  PaymentReference: string;
  RetrievalReferenceNumber: string;
  SplitAccounts: any[];
  TransactionDate: string;
  ResponseCode: string;
  ResponseDescription: string;
  AccountNumber?: string;
}

export class PaymentService {
  private merchantCode: string;
  private payItemId: string;
  private mode: string;
  private apiBaseUrl: string;
  private inlineScriptUrl: string;

  constructor() {
    this.merchantCode = process.env.INTERSWITCH_MERCHANT_CODE || 'MX51309';
    this.payItemId = process.env.INTERSWITCH_PAY_ITEM_ID || '6242829';
    this.mode = process.env.INTERSWITCH_MODE || 'TEST';
    this.apiBaseUrl = process.env.INTERSWITCH_API_BASE_URL || 'https://qa.interswitchng.com';
    this.inlineScriptUrl =
      process.env.INTERSWITCH_INLINE_SCRIPT_URL ||
      'https://newwebpay.qa.interswitchng.com/inline-checkout.js';
  }

  /**
   * Generate unique transaction reference
   */
  generateTxnRef(): string {
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    return `QT-${timestamp}-${uuid}`.toUpperCase();
  }

  /**
   * Initiate payment - creates PaymentTransaction and returns checkout params
   */
  async initiatePayment(offerId: string, addressId: string, userId: string) {
    // Fetch offer with customer details and measurements
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        customer: {
          include: {
            measurements: true,
          },
        },
        designer: true,
        design: true,
      },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status !== 'ACCEPTED') {
      throw new Error('Offer must be accepted before payment');
    }

    if (offer.customerId !== userId) {
      throw new Error('Unauthorized: You can only pay for your own offers');
    }

    if (!offer.finalPrice) {
      throw new Error('Offer does not have a final price');
    }

    // Validate measurements exist (either on offer or customer profile)
    const hasMeasurements =
      offer.measurements || (offer.customer.measurements && offer.customer.measurements.length > 0);
    if (!hasMeasurements) {
      throw new Error('Measurements are required before payment');
    }

    // Validate address exists
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
      throw new Error('Invalid shipping address');
    }

    // Check if there's an existing pending payment that hasn't been attempted yet
    // We only reuse truly pending payments (retriesCount = 0) to avoid duplicate txnRef issues
    const existingPayment = await prisma.paymentTransaction.findFirst({
      where: {
        offerId,
        status: PaymentStatus.PENDING,
        retriesCount: 0, // Only reuse if never attempted
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (existingPayment) {
      // Return existing payment params
      return this.prepareCheckoutParams(existingPayment, offer.customer, offer.designer);
    }

    // Mark any old failed/cancelled payments as expired to avoid confusion
    await prisma.paymentTransaction.updateMany({
      where: {
        offerId,
        status: {
          in: [PaymentStatus.FAILED, PaymentStatus.CANCELLED],
        },
      },
      data: {
        status: PaymentStatus.EXPIRED,
      },
    });

    // Create new payment transaction
    const txnRef = this.generateTxnRef();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    const paymentTransaction = await prisma.paymentTransaction.create({
      data: {
        offerId,
        txnRef,
        amount: offer.finalPrice,
        currency: '566', // NGN
        status: PaymentStatus.PENDING,
        expiresAt,
      },
    });

    return this.prepareCheckoutParams(paymentTransaction, offer.customer, offer.designer);
  }

  /**
   * Prepare checkout parameters for Interswitch inline checkout
   */
  private prepareCheckoutParams(
    payment: any,
    customer: any,
    designer: any
  ): InterswitchCheckoutParams {
    return {
      merchant_code: this.merchantCode,
      pay_item_id: this.payItemId,
      txn_ref: payment.txnRef,
      amount: Math.round(payment.amount * 100), // Convert to kobo
      currency: payment.currency,
      cust_name: customer.fullName || customer.email,
      cust_email: customer.email,
      cust_id: customer.id,
      designer_name: designer.fullName || designer.businessName || 'Designer',
      mode: this.mode,
    };
  }

  /**
   * Verify payment transaction with Interswitch
   */
  async verifyTransaction(txnRef: string, userId: string, payRef?: string, isSimulated?: boolean) {
    const payment = await prisma.paymentTransaction.findUnique({
      where: { txnRef },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new Error('Payment transaction not found');
    }

    // Verify the user owns this payment
    const offer = await prisma.offer.findUnique({
      where: { id: payment.offerId },
    });

    if (!offer || offer.customerId !== userId) {
      throw new Error('Unauthorized: Not your payment');
    }

    // Check if payment already successful
    if (payment.status === PaymentStatus.SUCCESSFUL && payment.order) {
      return {
        success: true,
        payment,
        message: 'Payment already completed',
      };
    }

    // Check if expired
    if (payment.expiresAt < new Date() && payment.status === PaymentStatus.PENDING) {
      await prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.EXPIRED,
          responseDescription: 'Payment link expired',
        },
      });

      throw new Error('Payment link has expired');
    }

    try {
      // Check if this is a simulated payment
      if (isSimulated || payRef?.startsWith('SIM-')) {
        // For simulated payments, mark as successful without calling Interswitch
        console.log(`[SIMULATION] Processing simulated payment: ${txnRef}, PayRef: ${payRef}`);

        const updatedPayment = await prisma.paymentTransaction.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESSFUL,
            responseCode: '00',
            responseDescription: 'Simulated payment - Approved',
            paymentReference: payRef || `SIM-${Date.now()}`,
            paidAt: new Date(),
            retriesCount: payment.retriesCount + 1,
          },
        });

        return {
          success: true,
          payment: updatedPayment,
          message: 'Payment successful',
          responseCode: '00',
        };
      }

      // Call Interswitch API to verify transaction
      const amountInKobo = Math.round(payment.amount * 100);
      const url = `${this.apiBaseUrl}/collections/api/v1/gettransaction.json`;
      const params = {
        merchantcode: this.merchantCode,
        transactionreference: txnRef,
        amount: amountInKobo,
      };

      const response = await axios.get<InterswitchVerifyResponse>(url, { params });
      const data = response.data;

      // Update payment transaction with response
      const updateData: any = {
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        paymentReference: data.PaymentReference,
        retriesCount: payment.retriesCount + 1,
      };

      // Determine payment status based on response code
      if (isPaymentSuccessful(data.ResponseCode)) {
        updateData.status = PaymentStatus.SUCCESSFUL;
        updateData.paidAt = new Date();
      } else if (isPaymentCancelled(data.ResponseCode)) {
        updateData.status = PaymentStatus.CANCELLED;
      } else if (!isPaymentPending(data.ResponseCode)) {
        updateData.status = PaymentStatus.FAILED;
      }

      const updatedPayment = await prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: updateData,
      });

      return {
        success: isPaymentSuccessful(data.ResponseCode),
        payment: updatedPayment,
        message: getPaymentErrorMessage(data.ResponseCode),
        responseCode: data.ResponseCode,
      };
    } catch (error: any) {
      // Update payment with error
      await prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          retriesCount: payment.retriesCount + 1,
          responseDescription: error.message || 'Error verifying payment',
        },
      });

      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Handle webhook notification from Interswitch
   */
  async handleWebhook(payload: any) {
    // Implement webhook handling for TRANSACTION.COMPLETED events
    // This is called by Interswitch when transaction status changes
    const { transactionReference, responseCode, eventType } = payload;

    if (eventType !== 'TRANSACTION.COMPLETED') {
      return { processed: false, message: 'Not a final event' };
    }

    const payment = await prisma.paymentTransaction.findUnique({
      where: { txnRef: transactionReference },
    });

    if (!payment) {
      throw new Error('Payment transaction not found');
    }

    // Update payment status based on webhook
    const updateData: any = {
      responseCode,
      responseDescription: payload.responseDescription,
      paymentReference: payload.paymentReference,
    };

    if (isPaymentSuccessful(responseCode)) {
      updateData.status = PaymentStatus.SUCCESSFUL;
      updateData.paidAt = new Date();
    } else if (isPaymentCancelled(responseCode)) {
      updateData.status = PaymentStatus.CANCELLED;
    } else {
      updateData.status = PaymentStatus.FAILED;
    }

    const updatedPayment = await prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: updateData,
    });

    return {
      processed: true,
      payment: updatedPayment,
      message: getPaymentErrorMessage(responseCode),
    };
  }
}

export const paymentService = new PaymentService();
