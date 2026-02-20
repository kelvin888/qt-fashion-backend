import cron from 'node-cron';
import prisma from '../config/database';
import { OrderStatus } from '@prisma/client';
import { trackingService } from './tracking.service';
import walletService from './wallet.service';
import { notificationService } from './notification.service';
import feeService from './fee.service';

/**
 * Cron Service
 * Manages all scheduled background jobs for the escrow system
 */
class CronService {
  private jobs: any[] = [];

  /**
   * Initialize all cron jobs
   */
  start(): void {
    console.log('[Cron] Starting scheduled jobs...');

    // Job 1: Check shipment tracking every 6 hours
    const trackingJob = cron.schedule('0 */6 * * *', async () => {
      console.log('[Cron] Running shipment tracking check...');
      try {
        await trackingService.checkShipmentStatus();
      } catch (error) {
        console.error('[Cron] Error in tracking job:', error);
      }
    });
    this.jobs.push(trackingJob);

    // Job 2: Auto-confirm delivered orders (runs daily at 2 AM)
    const autoConfirmJob = cron.schedule('0 2 * * *', async () => {
      console.log('[Cron] Running auto-confirm check...');
      try {
        await this.autoConfirmOrders();
      } catch (error) {
        console.error('[Cron] Error in auto-confirm job:', error);
      }
    });
    this.jobs.push(autoConfirmJob);

    // Job 3: Send deadline reminders (runs daily at 9 AM)
    const deadlineRemindersJob = cron.schedule('0 9 * * *', async () => {
      console.log('[Cron] Running deadline reminders...');
      try {
        await this.sendDeadlineReminders();
      } catch (error) {
        console.error('[Cron] Error in deadline reminders job:', error);
      }
    });
    this.jobs.push(deadlineRemindersJob);

    // Job 4: Send auto-confirm warnings (runs daily at 10 AM)
    const autoConfirmWarningJob = cron.schedule('0 10 * * *', async () => {
      console.log('[Cron] Sending auto-confirm warnings...');
      try {
        await this.sendAutoConfirmWarnings();
      } catch (error) {
        console.error('[Cron] Error in auto-confirm warning job:', error);
      }
    });
    this.jobs.push(autoConfirmWarningJob);

    console.log(`[Cron] Started ${this.jobs.length} scheduled jobs`);
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    console.log('[Cron] Stopping all scheduled jobs...');
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
  }

  /**
   * Auto-confirm orders after 10-day confirmation window
   */
  private async autoConfirmOrders(): Promise<void> {
    const now = new Date();

    // Find delivered orders where auto-confirm time has passed
    const ordersToConfirm = await prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        autoConfirmAt: {
          lte: now,
        },
        customerConfirmedAt: null, // Not manually confirmed
      },
      include: {
        customer: true,
        designer: true,
      },
    });

    console.log(`[Cron] Auto-confirming ${ordersToConfirm.length} orders...`);

    for (const order of ordersToConfirm) {
      try {
        // Calculate platform fee using dynamic fee service
        const feeCalc = await feeService.calculateFeeForDesigner(
          order.designerId,
          order.finalPrice,
          now
        );
        const platformFee = feeCalc.feeAmount;
        const netAmount = feeCalc.designerReceives;

        console.log(
          `[Cron] Order ${order.orderNumber}: ${(feeCalc.percentage * 100).toFixed(1)}% fee via ${feeCalc.appliedRule}`
        );

        // Release payment to designer
        await walletService.creditWallet({
          userId: order.designerId,
          amount: netAmount,
          description: `Payment for order ${order.id} (auto-confirmed)`,
          orderId: order.id,
        });

        // Update order
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.COMPLETED,
            deliveryConfirmedBy: 'SYSTEM',
            customerConfirmedAt: now,
            paymentReleasedAt: now,
            paymentAmount: netAmount,
            platformFee,
            feePercentageApplied: feeCalc.percentage,
            feeRuleApplied: feeCalc.appliedRule,
          },
          include: {
            customer: true,
            designer: true,
          },
        });

        console.log(`[Cron] Auto-confirmed order ${order.id}`);

        // Notify designer
        await notificationService.notifyPaymentReleased(updatedOrder);

        // Notify buyer about auto-confirmation
        await notificationService.notifyUser({
          userId: order.customerId,
          type: 'ORDER_UPDATE',
          title: '✅ Order Auto-Confirmed',
          message: `Your order #${order.id} was automatically confirmed. Payment released to designer.`,
          data: { orderId: order.id },
        });
      } catch (error) {
        console.error(`[Cron] Error auto-confirming order ${order.id}:`, error);
      }
    }
  }

  /**
   * Send warnings for orders nearing auto-confirmation (2 days before)
   */
  private async sendAutoConfirmWarnings(): Promise<void> {
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Find delivered orders that will auto-confirm in 2 days
    const ordersNearingAutoConfirm = await prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        autoConfirmAt: {
          gte: twoDaysFromNow,
          lte: threeDaysFromNow,
        },
        customerConfirmedAt: null,
      },
      include: {
        customer: true,
      },
    });

    console.log(`[Cron] Sending ${ordersNearingAutoConfirm.length} auto-confirm warnings...`);

    for (const order of ordersNearingAutoConfirm) {
      try {
        const hoursRemaining = Math.floor(
          (order.autoConfirmAt!.getTime() - Date.now()) / (1000 * 60 * 60)
        );
        await notificationService.notifyAutoConfirmSoon(order, hoursRemaining);
      } catch (error) {
        console.error(`[Cron] Error sending warning for order ${order.id}:`, error);
      }
    }
  }

  /**
   * Send deadline reminders to designers
   * Reminders at: T-5 days, T-3 days, deadline day, T+1 day (overdue)
   */
  private async sendDeadlineReminders(): Promise<void> {
    const now = new Date();
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    // Get active orders with upcoming or past deadlines
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.PENDING, OrderStatus.CONSTRUCTION, OrderStatus.SOURCING],
        },
        deadline: {
          not: null,
        },
      },
      include: {
        designer: true,
        customer: true,
      },
    });

    console.log(`[Cron] Checking ${orders.length} orders for deadline reminders...`);

    for (const order of orders) {
      if (!order.deadline) continue;

      const deadline = new Date(order.deadline);
      const deadlineDate = deadline.toDateString();

      try {
        // T-5 days reminder
        if (fiveDaysFromNow.toDateString() === deadlineDate) {
          await notificationService.notifyUser({
            userId: order.designerId,
            type: 'ORDER_UPDATE',
            title: '⏰ Deadline in 5 Days',
            message: `Order #${order.id} deadline is in 5 days. Remember to ship 3 days before the deadline!`,
            data: { orderId: order.id },
          });
        }

        // T-3 days reminder (SHIP NOW!)
        if (threeDaysFromNow.toDateString() === deadlineDate) {
          await notificationService.notifyUser({
            userId: order.designerId,
            type: 'ORDER_UPDATE',
            title: '🚨 SHIP TODAY - Deadline in 3 Days',
            message: `Order #${order.id} must be shipped TODAY to meet the customer deadline!`,
            data: { orderId: order.id },
          });
        }

        // Deadline day
        if (now.toDateString() === deadlineDate) {
          await notificationService.notifyUser({
            userId: order.designerId,
            type: 'ORDER_UPDATE',
            title: '📅 Deadline Today',
            message: `Order #${order.id} deadline is TODAY. Ensure it's shipped with tracking!`,
            data: { orderId: order.id },
          });

          // Also notify buyer
          await notificationService.notifyUser({
            userId: order.customerId,
            type: 'ORDER_UPDATE',
            title: '📅 Order Deadline Today',
            message: `Your order #${order.id} deadline is today. We're monitoring delivery status.`,
            data: { orderId: order.id },
          });
        }

        // T+1 day (OVERDUE)
        if (yesterday.toDateString() === deadlineDate) {
          await notificationService.notifyUser({
            userId: order.designerId,
            type: 'ORDER_UPDATE',
            title: '⚠️ Order OVERDUE',
            message: `Order #${order.id} deadline was yesterday. Please ship immediately or contact customer!`,
            data: { orderId: order.id },
          });

          // Notify buyer about potential delay
          await notificationService.notifyUser({
            userId: order.customerId,
            type: 'ORDER_UPDATE',
            title: '⚠️ Order Deadline Passed',
            message: `Order #${order.id} deadline has passed. We've notified the designer. You can open a dispute if needed.`,
            data: { orderId: order.id },
          });
        }
      } catch (error) {
        console.error(`[Cron] Error sending reminder for order ${order.id}:`, error);
      }
    }
  }
}

export const cronService = new CronService();
