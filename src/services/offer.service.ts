import { PrismaClient, OfferStatus } from '@prisma/client';
import orderService from './order.service';

const prisma = new PrismaClient();

export interface CreateOfferData {
  customerId: string;
  designerId: string;
  designId: string;
  customerPrice: number;
  measurements?: any;
  notes?: string;
  expiresAt?: Date;
}

export interface CounterOfferData {
  designerPrice: number;
  designerNotes?: string;
}

class OfferService {
  /**
   * Create new offer (Customer makes offer to designer)
   */
  async createOffer(data: CreateOfferData) {
    // Verify design exists and get designer info
    const design = await prisma.design.findUnique({
      where: { id: data.designId },
      include: { designer: true },
    });

    if (!design) {
      throw new Error('Design not found');
    }

    // Auto-set expiration to 7 days if not provided
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const offer = await prisma.offer.create({
      data: {
        customerId: data.customerId,
        designerId: design.designerId,
        designId: data.designId,
        customerPrice: data.customerPrice,
        measurements: data.measurements,
        notes: data.notes,
        expiresAt,
        status: OfferStatus.PENDING,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
            category: true,
          },
        },
      },
    });

    return offer;
  }

  /**
   * Get offers for a user (customer or designer)
   */
  async getOffers(userId: string, role: string) {
    const where = role === 'DESIGNER' ? { designerId: userId } : { customerId: userId };

    const offers = await prisma.offer.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return offers;
  }

  /**
   * Get single offer by ID
   */
  async getOfferById(offerId: string, userId: string) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
            category: true,
          },
        },
      },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    // Verify user has access to this offer
    if (offer.customerId !== userId && offer.designerId !== userId) {
      throw new Error('Unauthorized to view this offer');
    }

    return offer;
  }

  /**
   * Accept offer (Designer accepts customer's offer)
   */
  async acceptOffer(offerId: string, designerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { design: { select: { productionSteps: true } } },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.designerId !== designerId) {
      throw new Error('Unauthorized to accept this offer');
    }

    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      throw new Error(`Cannot accept offer with status: ${offer.status}`);
    }

    // Check if expired
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      await prisma.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.EXPIRED },
      });
      throw new Error('Offer has expired');
    }

    // ✅ Validate production steps BEFORE updating offer status
    if (
      !offer.design?.productionSteps ||
      !Array.isArray(offer.design.productionSteps) ||
      offer.design.productionSteps.length === 0
    ) {
      throw new Error(
        'This design has no production steps defined. Please contact the designer to add production workflow before placing an order.'
      );
    }

    // ✅ Use transaction to ensure offer update and order creation happen atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update offer status
      const updatedOffer = await tx.offer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.ACCEPTED,
          finalPrice: offer.designerPrice || offer.customerPrice,
          acceptedAt: new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          designer: {
            select: {
              id: true,
              fullName: true,
              brandName: true,
            },
          },
          design: true,
        },
      });

      // Create order (this will throw if production steps validation fails)
      await orderService.createOrder({
        offerId: updatedOffer.id,
        customerId: updatedOffer.customerId,
        designerId: updatedOffer.designerId,
        designId: updatedOffer.designId,
        finalPrice: updatedOffer.finalPrice!,
        measurements: updatedOffer.measurements,
      });

      return updatedOffer;
    });

    return result;
  }

  /**
   * Counter offer (Designer proposes different price)
   */
  async counterOffer(offerId: string, designerId: string, data: CounterOfferData) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.designerId !== designerId) {
      throw new Error('Unauthorized to counter this offer');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new Error(`Cannot counter offer with status: ${offer.status}`);
    }

    // Check if expired
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      await prisma.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.EXPIRED },
      });
      throw new Error('Offer has expired');
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.COUNTERED,
        designerPrice: data.designerPrice,
        designerNotes: data.designerNotes,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
          },
        },
        design: true,
      },
    });

    return updatedOffer;
  }

  /**
   * Reject offer (Designer rejects customer's offer)
   */
  async rejectOffer(offerId: string, designerId: string, designerNotes?: string) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.designerId !== designerId) {
      throw new Error('Unauthorized to reject this offer');
    }

    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      throw new Error(`Cannot reject offer with status: ${offer.status}`);
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.REJECTED,
        designerNotes,
      },
      include: {
        customer: true,
        designer: true,
        design: true,
      },
    });

    return updatedOffer;
  }

  /**
   * Withdraw offer (Customer withdraws their offer)
   */
  async withdrawOffer(offerId: string, customerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.customerId !== customerId) {
      throw new Error('Unauthorized to withdraw this offer');
    }

    if (offer.status === OfferStatus.ACCEPTED) {
      throw new Error('Cannot withdraw accepted offer');
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.WITHDRAWN,
      },
      include: {
        customer: true,
        designer: true,
        design: true,
      },
    });

    return updatedOffer;
  }
}

export default new OfferService();
