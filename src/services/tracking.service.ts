import prisma from '../config/database';
import { OrderStatus } from '@prisma/client';
import { notificationService } from './notification.service';

/**
 * Tracking Service
 * Handles shipment tracking and automatic delivery detection
 */
class TrackingService {
  /**
   * Check delivery status for all shipped orders
   * This will be called by a cron job every 6 hours
   */
  async checkShipmentStatus(): Promise<void> {
    try {
      // Get all orders that are shipped but not yet delivered
      const shippedOrders = await prisma.order.findMany({
        where: {
          status: OrderStatus.SHIPPED,
          trackingNumber: { not: null },
          deliveredAt: null,
        },
        include: {
          customer: true,
          designer: true,
        },
      });

      console.log(`[Tracking] Checking ${shippedOrders.length} shipped orders...`);

      for (const order of shippedOrders) {
        try {
          // For now, we'll implement a mock tracking check
          // In production, integrate with tracking APIs like:
          // - AfterShip API
          // - Sendbox API
          // - Carrier-specific APIs (DHL, FedEx, etc.)

          const deliveryStatus = await this.getTrackingStatus(
            order.trackingNumber!,
            order.carrier || 'Unknown'
          );

          if (deliveryStatus.isDelivered) {
            await this.markAsDelivered(order.id, deliveryStatus.deliveredAt);
          }
        } catch (error) {
          console.error(`[Tracking] Error checking order ${order.id}:`, error);
          // Continue with next order even if one fails
        }
      }
    } catch (error) {
      console.error('[Tracking] Error in checkShipmentStatus:', error);
    }
  }

  /**
   * Get tracking status from carrier API
   * TODO: Integrate with real tracking APIs
   */
  private async getTrackingStatus(
    trackingNumber: string,
    carrier: string
  ): Promise<{ isDelivered: boolean; deliveredAt?: Date }> {
    // MOCK IMPLEMENTATION
    // In production, implement actual API calls based on carrier

    // For demo purposes, you could add logic like:
    // - Check if shipment is older than 7 days = auto-mark delivered
    // - Integrate with AfterShip, Sendbox, or carrier-specific APIs

    console.log(`[Tracking] Mock check for ${carrier} tracking ${trackingNumber}`);

    return {
      isDelivered: false,
    };
  }

  /**
   * Mark an order as delivered and start confirmation window
   */
  private async markAsDelivered(orderId: string, deliveredAt?: Date): Promise<void> {
    const deliveryDate = deliveredAt || new Date();
    const confirmationWindowStart = deliveryDate;
    const confirmationWindowEnd = new Date(deliveryDate.getTime() + 10 * 24 * 60 * 60 * 1000); // +10 days
    const autoConfirmAt = confirmationWindowEnd;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: deliveryDate,
        confirmationWindowStart,
        confirmationWindowEnd,
        autoConfirmAt,
      },
      include: {
        customer: true,
        designer: true,
      },
    });

    console.log(`[Tracking] Order ${orderId} marked as delivered`);

    // Notify customer that order was delivered
    await notificationService.notifyOrderDelivered(updatedOrder);
  }

  /**
   * Manual delivery confirmation (for testing or manual override)
   */
  async manualMarkAsDelivered(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== OrderStatus.SHIPPED) {
      throw new Error('Order must be in SHIPPED status');
    }

    await this.markAsDelivered(orderId);
  }
}

export const trackingService = new TrackingService();
