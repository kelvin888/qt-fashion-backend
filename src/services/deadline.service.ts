import { PrismaClient, OrderStatus } from '@prisma/client';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

/**
 * Deadline Monitoring Service
 *
 * Monitors order deadlines and sends reminders to designers
 * Runs as a scheduled task to check for upcoming and overdue deadlines
 */
class DeadlineService {
  private lastCheck: Date | null = null;

  /**
   * Check for orders with upcoming deadlines and create reminder notifications
   * Runs periodically (every hour recommended)
   */
  async checkUpcomingDeadlines(): Promise<void> {
    try {
      const now = new Date();

      // Define reminder thresholds (72h, 24h, 6h before deadline)
      const thresholds = [
        { hours: 72, type: 'DEADLINE_REMINDER_72H', title: 'Deadline in 3 days' },
        { hours: 24, type: 'DEADLINE_REMINDER_24H', title: 'Deadline in 24 hours' },
        { hours: 6, type: 'DEADLINE_REMINDER_6H', title: 'Urgent: Deadline in 6 hours' },
      ];

      for (const threshold of thresholds) {
        const thresholdTime = new Date();
        thresholdTime.setHours(thresholdTime.getHours() + threshold.hours);

        // Find orders with deadlines within this threshold
        // That are not yet delivered/cancelled
        // And haven't been notified for this specific threshold yet
        const orders = await prisma.order.findMany({
          where: {
            deadline: {
              lte: thresholdTime,
              gt: now,
            },
            status: {
              notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
            },
          },
          include: {
            designer: {
              select: {
                id: true,
                fullName: true,
              },
            },
            customer: {
              select: {
                fullName: true,
              },
            },
            notifications: {
              where: {
                type: threshold.type,
              },
              select: {
                id: true,
              },
            },
          },
        });

        // Create notifications for orders that haven't been notified yet
        for (const order of orders) {
          // Skip if already notified for this threshold
          if (order.notifications.length > 0) {
            continue;
          }

          const hoursRemaining = Math.floor(
            (order.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60)
          );

          const message = this.generateReminderMessage(
            order.orderNumber,
            order.customer.fullName,
            hoursRemaining
          );

          await notificationService.createNotification({
            userId: order.designerId,
            type: threshold.type,
            title: threshold.title,
            message,
            orderId: order.id,
          });

          console.log(`📅 Created ${threshold.type} notification for order ${order.orderNumber}`);
        }
      }

      this.lastCheck = now;
    } catch (error) {
      console.error('❌ Error checking upcoming deadlines:', error);
    }
  }

  /**
   * Check for overdue orders and mark them with notifications
   */
  async checkOverdueOrders(): Promise<void> {
    try {
      const now = new Date();

      // Find orders past their deadline that are not delivered/cancelled
      const overdueOrders = await prisma.order.findMany({
        where: {
          deadline: {
            lt: now,
          },
          status: {
            notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
          },
        },
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
            },
          },
          customer: {
            select: {
              id: true,
              fullName: true,
            },
          },
          notifications: {
            where: {
              type: 'DEADLINE_OVERDUE',
            },
            select: {
              id: true,
            },
          },
        },
      });

      for (const order of overdueOrders) {
        // Skip if already notified about being overdue
        if (order.notifications.length > 0) {
          continue;
        }

        const daysOverdue = Math.floor(
          (now.getTime() - order.deadline!.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Notify designer
        await notificationService.createNotification({
          userId: order.designerId,
          type: 'DEADLINE_OVERDUE',
          title: 'Order overdue!',
          message: `Order ${order.orderNumber} is ${daysOverdue} day(s) overdue. Please complete and ship as soon as possible.`,
          orderId: order.id,
        });

        // Also notify customer
        await notificationService.createNotification({
          userId: order.customer.id,
          type: 'DEADLINE_OVERDUE',
          title: 'Order deadline passed',
          message: `Your order ${order.orderNumber} has passed its expected deadline. The designer has been notified to expedite completion.`,
          orderId: order.id,
        });

        console.log(
          `⚠️ Created overdue notifications for order ${order.orderNumber} (${daysOverdue} days overdue)`
        );
      }
    } catch (error) {
      console.error('❌ Error checking overdue orders:', error);
    }
  }

  /**
   * Main monitoring function - runs both upcoming and overdue checks
   */
  async monitorDeadlines(): Promise<void> {
    console.log('🔍 Running deadline monitoring...');
    await this.checkUpcomingDeadlines();
    await this.checkOverdueOrders();
    console.log('✅ Deadline monitoring complete');
  }

  /**
   * Generate a friendly reminder message
   */
  private generateReminderMessage(
    orderNumber: string,
    customerName: string,
    hoursRemaining: number
  ): string {
    if (hoursRemaining > 48) {
      return `Order ${orderNumber} for ${customerName} is due in ${Math.floor(
        hoursRemaining / 24
      )} days. Please ensure you're on track!`;
    } else if (hoursRemaining > 24) {
      return `Order ${orderNumber} for ${customerName} is due tomorrow. Please ensure completion and shipping!`;
    } else if (hoursRemaining > 6) {
      return `⚠️ Order ${orderNumber} for ${customerName} is due in ${hoursRemaining} hours. Please complete urgently!`;
    } else {
      return `🚨 URGENT: Order ${orderNumber} for ${customerName} is due in ${hoursRemaining} hours!`;
    }
  }

  /**
   * Get statistics about deadlines (useful for dashboards)
   */
  async getDeadlineStats(designerId: string): Promise<{
    upcomingDeadlines: number;
    overdueOrders: number;
    onTimeDeliveryRate: number;
  }> {
    const now = new Date();

    // Count upcoming deadlines (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingDeadlines = await prisma.order.count({
      where: {
        designerId,
        deadline: {
          gte: now,
          lte: sevenDaysFromNow,
        },
        status: {
          notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        },
      },
    });

    // Count overdue orders
    const overdueOrders = await prisma.order.count({
      where: {
        designerId,
        deadline: {
          lt: now,
        },
        status: {
          notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        },
      },
    });

    // Calculate on-time delivery rate
    const ordersWithDeadlines = await prisma.order.findMany({
      where: {
        designerId,
        deadline: {
          not: null,
        },
        status: OrderStatus.DELIVERED,
      },
      select: {
        deadline: true,
        deliveredAt: true,
      },
    });

    const onTimeDeliveries = ordersWithDeadlines.filter(
      (order) => order.deliveredAt && order.deliveredAt <= order.deadline!
    ).length;

    const onTimeDeliveryRate =
      ordersWithDeadlines.length > 0 ? (onTimeDeliveries / ordersWithDeadlines.length) * 100 : 100;

    return {
      upcomingDeadlines,
      overdueOrders,
      onTimeDeliveryRate,
    };
  }
}

export const deadlineService = new DeadlineService();
