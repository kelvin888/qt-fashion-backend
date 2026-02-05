/**
 * Order Service
 *
 * Business logic for order management, production tracking, and shipment.
 */

import prisma from '../config/database';
import { Order, OrderStatus } from '@prisma/client';

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

    console.log('📦 Creating order for design:', {
      designId: data.designId,
      designTitle: design?.title,
      hasDesign: !!design,
      productionSteps: design?.productionSteps,
      productionStepsType: typeof design?.productionSteps,
      isArray: Array.isArray(design?.productionSteps),
      length: Array.isArray(design?.productionSteps) ? design.productionSteps.length : 'N/A',
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

    const order = await prisma.order.create({
      data: {
        orderNumber,
        offerId: data.offerId,
        customerId: data.customerId,
        designerId: data.designerId,
        designId: data.designId,
        finalPrice: data.finalPrice,
        measurements: data.measurements || {},
        status: 'CONFIRMED',
        productionSteps: productionSteps as any,
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

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        carrier: data.carrier,
        trackingNumber: data.trackingNumber,
        estimatedDelivery: data.estimatedDelivery,
        status: 'SHIPPING',
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
   * Get order statistics for designer
   */
  async getDesignerStats(userId: string) {
    const [total, confirmed, inProgress, completed, revenue] = await Promise.all([
      prisma.order.count({
        where: { designerId: userId },
      }),
      prisma.order.count({
        where: {
          designerId: userId,
          status: 'CONFIRMED',
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
    ]);

    return {
      total,
      confirmed,
      inProgress,
      completed,
      totalRevenue: revenue._sum.finalPrice || 0,
    };
  }
}

export default new OrderService();
