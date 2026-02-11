import { PrismaClient, Notification } from '@prisma/client';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const prisma = new PrismaClient();
const expo = new Expo();

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  orderId?: string;
  data?: Record<string, any>;
}

interface SendPushNotificationInput {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a new notification for a user
   */
  async createNotification(data: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        orderId: data.orderId,
        read: false,
      },
    });
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const where = {
      userId,
      ...(options?.unreadOnly && { read: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              deadline: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /**
   * Send push notification to user's device
   */
  async sendPushNotification(input: SendPushNotificationInput): Promise<void> {
    try {
      // Get user's push token
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { expoPushToken: true },
      });

      if (!user?.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) {
        console.log(`User ${input.userId} has no valid push token, skipping push notification`);
        return;
      }

      const message: ExpoPushMessage = {
        to: user.expoPushToken,
        sound: 'default',
        title: input.title,
        body: input.message,
        data: input.data || {},
      };

      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log('📲 Push notification sent:', ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }
    } catch (error) {
      console.error('Error in sendPushNotification:', error);
      // Don't throw - push notification failure shouldn't break the flow
    }
  }

  /**
   * Create in-app notification AND send push notification
   * This is the main method to use for all notifications
   */
  async notifyUser(data: CreateNotificationInput): Promise<Notification> {
    // Create in-app notification
    const notification = await this.createNotification(data);

    // Send push notification asynchronously (don't wait)
    this.sendPushNotification({
      userId: data.userId,
      title: data.title,
      message: data.message,
      data: data.data || { orderId: data.orderId },
    }).catch((error) => {
      console.error('Failed to send push notification:', error);
    });

    return notification;
  }

  /**
   * Order lifecycle notification helpers
   */

  async notifyOrderShipped(order: any): Promise<void> {
    await this.notifyUser({
      userId: order.customerId,
      type: 'ORDER_SHIPPED',
      title: '📦 Order Shipped!',
      message: `Your order #${order.orderNumber} has been shipped via ${order.carrier}. Tracking: ${order.trackingNumber}`,
      orderId: order.id,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
      },
    });
  }

  async notifyOrderDelivered(order: any): Promise<void> {
    await this.notifyUser({
      userId: order.customerId,
      type: 'ORDER_DELIVERED',
      title: '✅ Order Delivered!',
      message: `Your order #${order.orderNumber} has been delivered! Please confirm receipt within 10 days.`,
      orderId: order.id,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });
  }

  async notifyPaymentReleased(order: any): Promise<void> {
    await this.notifyUser({
      userId: order.designerId,
      type: 'PAYMENT_RELEASED',
      title: '💰 Payment Released!',
      message: `₦${order.paymentAmount?.toLocaleString()} has been deposited to your wallet for order #${order.orderNumber}`,
      orderId: order.id,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.paymentAmount,
      },
    });
  }

  async notifyDisputeOpened(order: any): Promise<void> {
    await this.notifyUser({
      userId: order.designerId,
      type: 'DISPUTE_OPENED',
      title: '⚠️ Dispute Opened',
      message: `Customer opened a dispute for order #${order.orderNumber}. Please respond promptly.`,
      orderId: order.id,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: order.disputeReason,
      },
    });
  }

  async notifyAutoConfirmSoon(order: any, hoursRemaining: number): Promise<void> {
    await this.notifyUser({
      userId: order.customerId,
      type: 'AUTO_CONFIRM_WARNING',
      title: '⏰ Auto-Confirm Soon',
      message: `Order #${order.orderNumber} will be auto-confirmed in ${hoursRemaining} hours. Confirm receipt or open dispute if there's an issue.`,
      orderId: order.id,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        hoursRemaining,
      },
    });
  }
}

export const notificationService = new NotificationService();
