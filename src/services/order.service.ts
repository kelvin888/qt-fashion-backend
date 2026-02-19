/**
 * Order Service
 *
 * Business logic for order management, production tracking, and shipment.
 */

import prisma from '../config/database';
import { Order, OrderStatus } from '@prisma/client';
import walletService from './wallet.service';
import { notificationService } from './notification.service';

interface ProductionStep {
  step: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: Date;
}

interface CreateOrderData {
  offerId: string;
  customerId: string;
  designerId: string;
  designId: string;
  finalPrice: number;
  measurements?: any;
  deadline?: Date | null;
}

interface UpdateOrderStatusData {
  status: OrderStatus;
  progressNotes?: string;
}

interface UpdateProductionData {
  productionSteps?: ProductionStep[];
  progressNotes?: string;
}

interface UpdateProductionStepData {
  status?: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  notes?: string;
}

interface UpdateShipmentData {
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: Date;
}

interface ConfirmDeliveryData {
  rating?: number;
  review?: string;
}

class OrderService {
  /**
   * Generate unique order number (QT-YYYY-XXXXX)
   */
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.order.count({
      where: {
        orderNumber: {
          startsWith: `QT-${year}-`,
        },
      },
    });

    const nextNumber = (count + 1).toString().padStart(5, '0');
    return `QT-${year}-${nextNumber}`;
  }

  /**
   * Create order from accepted offer
   */
  async createOrder(data: CreateOrderData): Promise<Order> {
    const orderNumber = await this.generateOrderNumber();

    // Fetch the design to get custom production steps
    const design = await prisma.design.findUnique({
      where: { id: data.designId },
      select: { productionSteps: true, id: true, title: true },
    });

    // Production steps are required - designer must define them
    if (
      !design?.productionSteps ||
      !Array.isArray(design.productionSteps) ||
      design.productionSteps.length === 0
    ) {
      console.error('❌ No production steps found for design:', data.designId);
      throw new Error(
        'This design has no production steps defined. Please contact the designer to add production workflow before placing an order.'
      );
    }

    // Transform design production steps to order production steps
    const productionSteps: ProductionStep[] = (design.productionSteps as any[]).map(
      (step: any) => ({
        step: step.title || step.step,
        status: 'pending' as const,
      })
    );

    // Set buyer protection until 60 days from now
    const buyerProtectionUntil = new Date();
    buyerProtectionUntil.setDate(buyerProtectionUntil.getDate() + 60);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        offerId: data.offerId,
        customerId: data.customerId,
        designerId: data.designerId,
        designId: data.designId,
        finalPrice: data.finalPrice,
        measurements: data.measurements || {},
        status: 'PENDING',
        productionSteps: productionSteps as any,
        deadline: data.deadline || null,
        buyerProtectionUntil,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
        offer: true,
      },
    });

    return order;
  }

  /**
   * Create order from successful payment transaction
   */
  async createOrderFromPayment(
    paymentTransactionId: string,
    shippingAddressId: string
  ): Promise<Order> {
    // Fetch payment transaction with offer details
    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new Error('Payment transaction not found');
    }

    if (payment.status !== 'SUCCESSFUL') {
      throw new Error('Payment must be successful to create order');
    }

    if (payment.orderId) {
      throw new Error('Order already exists for this payment');
    }

    // Fetch offer details
    const offer = await prisma.offer.findUnique({
      where: { id: payment.offerId },
      include: {
        design: { select: { productionSteps: true, id: true, title: true } },
      },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status !== 'ACCEPTED') {
      throw new Error('Offer must be accepted before creating order');
    }

    // Check if an order already exists for this offer
    const existingOrder = await prisma.order.findUnique({
      where: { offerId: offer.id },
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
        offer: true,
      },
    });

    if (existingOrder) {
      // If order exists, just link this payment to it if not already linked
      if (!payment.orderId) {
        await prisma.paymentTransaction.update({
          where: { id: paymentTransactionId },
          data: { orderId: existingOrder.id },
        });
      }
      return existingOrder;
    }

    // Validate address
    console.log('[Order Service] Looking up shipping address:', {
      shippingAddressId,
      offerCustomerId: offer.customerId,
    });

    const address = await prisma.address.findUnique({
      where: { id: shippingAddressId },
    });

    console.log('[Order Service] Address validation result:', {
      shippingAddressId,
      found: !!address,
      addressUserId: address?.userId,
      offerCustomerId: offer.customerId,
      match: address?.userId === offer.customerId,
    });

    if (!address || address.userId !== offer.customerId) {
      console.error('[Order Service] Invalid shipping address:', {
        shippingAddressId,
        addressFound: !!address,
        addressUserId: address?.userId,
        offerCustomerId: offer.customerId,
      });
      throw new Error('Invalid shipping address');
    }

    // Validate production steps
    if (
      !offer.design?.productionSteps ||
      !Array.isArray(offer.design.productionSteps) ||
      offer.design.productionSteps.length === 0
    ) {
      throw new Error('This design has no production steps defined. Cannot create order.');
    }

    // Transform design production steps to order production steps
    const productionSteps: ProductionStep[] = (offer.design.productionSteps as any[]).map(
      (step: any) => ({
        step: step.title || step.step,
        status: 'pending' as const,
      })
    );

    const orderNumber = await this.generateOrderNumber();

    // Create order with payment and address links
    const order = await prisma.order.create({
      data: {
        orderNumber,
        offerId: offer.id,
        customerId: offer.customerId,
        designerId: offer.designerId,
        designId: offer.designId,
        finalPrice: payment.amount,
        measurements: offer.measurements || {},
        status: 'PENDING',
        productionSteps: productionSteps as any,
        paymentTransactionId: payment.id,
        shippingAddressId: address.id,
        deadline: offer.deadline || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
        offer: true,
        paymentTransaction: true,
        shippingAddress: true,
      },
    });

    // Update payment transaction with order ID
    await prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: { orderId: order.id },
    });

    // If this offer originated from a custom request, close the request now that
    // the payment has been verified and the order exists.
    const customRequestIdMatch = (offer.notes || '').match(/CUSTOM_REQUEST_ID:([A-Za-z0-9_-]+)/);
    const customRequestId = customRequestIdMatch?.[1];
    if (customRequestId) {
      await prisma.customRequest.updateMany({
        where: {
          id: customRequestId,
          customerId: offer.customerId,
        },
        data: {
          status: 'CLOSED' as any,
          closedAt: new Date(),
        },
      });
    }

    return order;
  }

  /**
   * Get all orders (filtered by user role)
   */
  async getOrders(userId: string, userRole: string): Promise<Order[]> {
    const where = userRole === 'DESIGNER' ? { designerId: userId } : { customerId: userId };

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders;
  }

  /**
   * Get single order by ID
   */
  async getOrderById(orderId: string, userId: string): Promise<Order> {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ customerId: userId }, { designerId: userId }],
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
            phoneNumber: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            category: true,
            fabricType: true,
            colors: true,
          },
        },
        offer: true,
      },
    });

    if (!order) {
      throw new Error('Order not found or access denied');
    }

    return order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    userId: string,
    data: UpdateOrderStatusData
  ): Promise<Order> {
    // Verify designer owns this order
    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        designerId: userId,
      },
    });

    if (!existing) {
      throw new Error('Order not found or access denied');
    }

    const updates: any = {
      status: data.status,
    };

    if (data.progressNotes) {
      updates.progressNotes = data.progressNotes;
    }

    if (data.status === 'DELIVERED') {
      updates.deliveredAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updates,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
      },
    });

    return order;
  }

  /**
   * Update production progress
   */
  async updateProduction(
    orderId: string,
    userId: string,
    data: UpdateProductionData
  ): Promise<Order> {
    // Verify designer owns this order
    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        designerId: userId,
      },
    });

    if (!existing) {
      throw new Error('Order not found or access denied');
    }

    const updates: any = {};

    if (data.productionSteps) {
      updates.productionSteps = data.productionSteps;
    }

    if (data.progressNotes) {
      updates.progressNotes = data.progressNotes;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updates,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
      },
    });

    return order;
  }

  /**
   * Update single production step
   */
  async updateProductionStep(
    orderId: string,
    userId: string,
    stepId: string,
    data: UpdateProductionStepData
  ): Promise<Order> {
    // Verify designer owns this order
    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        designerId: userId,
      },
    });

    if (!existing) {
      throw new Error('Order not found or access denied');
    }

    // Get current production steps
    const currentSteps = (existing.productionSteps as any[]) || [];

    // Find and update the specific step
    const updatedSteps = currentSteps.map((step: any) => {
      if (step.step === stepId) {
        return {
          ...step,
          ...(data.status && { status: data.status }),
          ...(data.completedAt && { completedAt: data.completedAt }),
          ...(data.notes && { notes: data.notes }),
        };
      }
      return step;
    });

    // Update the order
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        productionSteps: updatedSteps as any,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
      },
    });

    return order;
  }

  /**
   * Add shipment tracking
   */
  async addShipment(orderId: string, userId: string, data: UpdateShipmentData): Promise<Order> {
    // Verify designer owns this order
    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        designerId: userId,
      },
    });

    if (!existing) {
      throw new Error('Order not found or access denied');
    }

    // Validate tracking number format
    const trimmedTracking = data.trackingNumber.trim();
    if (trimmedTracking.length < 5) {
      throw new Error('Tracking number must be at least 5 characters');
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        carrier: data.carrier,
        trackingNumber: data.trackingNumber,
        estimatedDelivery: data.estimatedDelivery,
        shippedAt: new Date(),
        status: 'SHIPPED',
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
      },
    });

    // Notify customer that order has been shipped
    await notificationService.notifyOrderShipped(order);

    return order;
  }

  /**
   * Customer confirms receipt (starts 10-day auto-confirm countdown)
   * Can be called early to release payment immediately
   */
  async confirmReceipt(orderId: string, userId: string, data: ConfirmDeliveryData): Promise<Order> {
    // Verify customer owns this order
    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: userId,
      },
    });

    if (!existing) {
      throw new Error('Order not found or access denied');
    }

    // Can confirm if order is SHIPPED or DELIVERED
    if (
      existing.status !== 'SHIPPED' &&
      existing.status !== 'DELIVERED' &&
      existing.status !== 'AWAITING_CONFIRMATION'
    ) {
      throw new Error('Order must be shipped or delivered to confirm receipt');
    }

    // Calculate platform fee (10%)
    const platformFee = existing.finalPrice * 0.1;
    const paymentAmount = existing.finalPrice - platformFee;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        deliveredAt: existing.deliveredAt || new Date(),
        deliveryConfirmedBy: 'CUSTOMER',
        customerConfirmedAt: new Date(),
        paymentReleasedAt: new Date(),
        paymentAmount,
        platformFee,
        rating: data.rating,
        review: data.review,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
      },
    });

    // Release payment to designer's wallet
    await walletService.creditWallet({
      userId: order.designerId,
      amount: paymentAmount,
      description: `Payment for order ${order.orderNumber} - ${order.design.title}`,
      orderId: order.id,
    });

    console.log(
      `💸 Payment of ₦${paymentAmount.toLocaleString()} released to designer ${order.designer.fullName || order.designer.brandName} (after ₦${platformFee.toLocaleString()} platform fee)`
    );

    // Notify designer that payment has been released
    await notificationService.notifyPaymentReleased(order);

    return order;
  }

  /**
   * Customer opens dispute
   */
  async openDispute(orderId: string, userId: string, reason: string): Promise<Order> {
    // Verify customer owns this order
    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: userId,
      },
    });

    if (!existing) {
      throw new Error('Order not found or access denied');
    }

    // Check buyer protection period (60 days from creation)
    const protectionExpired =
      existing.buyerProtectionUntil && new Date() > existing.buyerProtectionUntil;
    if (protectionExpired) {
      throw new Error('Buyer protection period has expired');
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error('Please provide a detailed reason for the dispute (at least 10 characters)');
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DISPUTED',
        disputeOpenedAt: new Date(),
        disputeReason: reason.trim(),
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
      },
    });

    // Notify designer that a dispute was opened
    await notificationService.notifyDisputeOpened(order);

    return order;
  }

  /**
   * Confirm delivery (customer only) - LEGACY METHOD
   * Use confirmReceipt instead for new escrow flow
   */
  async confirmDelivery(
    orderId: string,
    userId: string,
    data: ConfirmDeliveryData
  ): Promise<Order> {
    // Verify customer owns this order
    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: userId,
      },
    });

    if (!existing) {
      throw new Error('Order not found or access denied');
    }

    // Verify order is in SHIPPING status
    if (existing.status !== 'SHIPPING') {
      throw new Error('Order must be in shipping status to confirm delivery');
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        rating: data.rating,
        review: data.review,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
      },
    });

    // Release payment to designer's wallet
    await walletService.creditWallet({
      userId: order.designerId,
      amount: order.finalPrice,
      description: `Payment for order ${order.orderNumber} - ${order.design.title}`,
      orderId: order.id,
    });

    console.log(
      `💸 Payment of ₦${order.finalPrice.toLocaleString()} released to designer ${order.designer.fullName || order.designer.brandName}`
    );

    return order;
  }

  /**
   * Get order statistics for designer
   */
  async getDesignerStats(userId: string) {
    const [total, pending, inProgress, completed, revenue, user, pendingRevenue] =
      await Promise.all([
        prisma.order.count({
          where: { designerId: userId },
        }),
        prisma.order.count({
          where: {
            designerId: userId,
            status: 'PENDING',
          },
        }),
        prisma.order.count({
          where: {
            designerId: userId,
            status: {
              in: ['SOURCING', 'CONSTRUCTION', 'QUALITY_CHECK'],
            },
          },
        }),
        prisma.order.count({
          where: {
            designerId: userId,
            status: 'DELIVERED',
          },
        }),
        prisma.order.aggregate({
          where: { designerId: userId },
          _sum: {
            finalPrice: true,
          },
        }),
        // Get user wallet balance
        prisma.user.findUnique({
          where: { id: userId },
          select: { walletBalance: true },
        }),
        // Get pending earnings (orders in SHIPPING status awaiting confirmation)
        prisma.order.aggregate({
          where: {
            designerId: userId,
            status: 'SHIPPING',
          },
          _sum: {
            finalPrice: true,
          },
        }),
      ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      totalRevenue: revenue._sum.finalPrice || 0,
      walletBalance: user?.walletBalance || 0,
      pendingEarnings: pendingRevenue._sum.finalPrice || 0,
    };
  }
}

export default new OrderService();
