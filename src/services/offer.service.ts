import { PrismaClient, OfferStatus, ResponsibleParty } from '@prisma/client';
import orderService from './order.service';
import { notificationService } from './notification.service';
import { realtimeEventService } from './realtime-event.service';

const prisma = new PrismaClient();

export interface CreateOfferData {
  customerId: string;
  designerId: string;
  designId: string;
  customerPrice: number;
  measurements?: any;
  notes?: string;
  expiresAt?: Date;
  tryOnImageUrl?: string;
  deadline?: Date;
}

export interface CounterOfferData {
  designerPrice: number;
  designerNotes?: string;
}

class OfferService {
  private publishOfferRealtimeToParticipants(
    offer: { id: string; customerId: string; designerId: string },
    action: string,
    actorUserId: string,
    payload?: Record<string, unknown>
  ) {
    realtimeEventService.publishToUsers([offer.customerId, offer.designerId], {
      type: 'OFFER_UPDATED',
      domain: 'offer',
      action,
      entityId: offer.id,
      actorUserId,
      payload: {
        offerId: offer.id,
        ...(payload || {}),
      },
    });
  }

  private async notifyCounterparty(
    offer: { id: string; customerId: string; designerId: string },
    actorUserId: string,
    input: {
      type: string;
      action: string;
      title: string;
      message: string;
      payload?: Record<string, unknown>;
    }
  ) {
    const recipientUserId = actorUserId === offer.customerId ? offer.designerId : offer.customerId;

    await notificationService.notifyUser({
      userId: recipientUserId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: {
        offerId: offer.id,
        ...(input.payload || {}),
      },
      realtime: {
        domain: 'offer',
        action: input.action,
        entityId: offer.id,
        actorUserId,
        payload: {
          offerId: offer.id,
          ...(input.payload || {}),
        },
      },
    });
  }

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
        tryOnImageUrl: data.tryOnImageUrl,
        expiresAt,
        deadline: data.deadline,
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

    await this.notifyCounterparty(offer, data.customerId, {
      type: 'OFFER_CREATED',
      action: 'offer_created',
      title: 'New Offer Received',
      message: `${offer.customer.fullName} sent you an offer for ${offer.design.title}.`,
      payload: {
        status: offer.status,
      },
    });

    this.publishOfferRealtimeToParticipants(offer, 'offer_created', data.customerId, {
      status: offer.status,
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
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
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
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
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

    // Update offer status to ACCEPTED
    // Order will be created after customer makes payment
    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.ACCEPTED,
        // If designer is accepting a customer counter (COUNTERED status), use customer price
        // Otherwise use designer's counter price or original customer price
        finalPrice:
          offer.status === OfferStatus.COUNTERED && !offer.designerPrice
            ? offer.customerPrice
            : offer.designerPrice || offer.customerPrice,
        acceptedAt: new Date(),
        awaitingResponseFrom: null, // Negotiation complete
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

    await this.notifyCounterparty(updatedOffer, designerId, {
      type: 'OFFER_ACCEPTED',
      action: 'offer_accepted',
      title: 'Offer Accepted',
      message: `Your offer for ${updatedOffer.design.title} was accepted. Proceed to payment.`,
      payload: {
        status: updatedOffer.status,
      },
    });

    this.publishOfferRealtimeToParticipants(updatedOffer, 'offer_accepted', designerId, {
      status: updatedOffer.status,
      awaitingResponseFrom: updatedOffer.awaitingResponseFrom,
    });

    return updatedOffer;
  }

  /**
   * Counter offer (Designer proposes different price)
   */
  async counterOffer(offerId: string, designerId: string, data: CounterOfferData) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { design: { select: { price: true } } },
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

    // Validate counter offer doesn't exceed original design price
    if (offer.design?.price && data.designerPrice > offer.design.price) {
      throw new Error(
        `Counter offer cannot exceed the original design price of ₦${offer.design.price.toLocaleString()}`
      );
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
        awaitingResponseFrom: ResponsibleParty.CUSTOMER, // Waiting for customer response
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

    await this.notifyCounterparty(updatedOffer, designerId, {
      type: 'OFFER_COUNTERED',
      action: 'designer_countered',
      title: 'Counter Offer Received',
      message: `${updatedOffer.designer.brandName || updatedOffer.designer.fullName} sent a counter offer.`,
      payload: {
        status: updatedOffer.status,
        designerPrice: updatedOffer.designerPrice,
      },
    });

    this.publishOfferRealtimeToParticipants(updatedOffer, 'designer_countered', designerId, {
      status: updatedOffer.status,
      designerPrice: updatedOffer.designerPrice,
      awaitingResponseFrom: updatedOffer.awaitingResponseFrom,
    });

    return updatedOffer;
  }

  /**
   * Customer counter offer (Customer makes counter offer to designer's counter)
   */
  async customerCounterOffer(
    offerId: string,
    customerId: string,
    newPrice: number,
    notes?: string
  ) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { design: { select: { price: true } } },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.customerId !== customerId) {
      throw new Error('Unauthorized to counter this offer');
    }

    if (offer.status !== OfferStatus.COUNTERED) {
      throw new Error(
        `Cannot counter offer with status: ${offer.status}. Offer must have a designer counter first.`
      );
    }

    // Validate counter offer doesn't exceed original design price
    if (offer.design?.price && newPrice > offer.design.price) {
      throw new Error(
        `Counter offer cannot exceed the original design price of ₦${offer.design.price.toLocaleString()}`
      );
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
        customerPrice: newPrice,
        notes: notes || offer.notes,
        awaitingResponseFrom: ResponsibleParty.DESIGNER, // Waiting for designer response
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

    await this.notifyCounterparty(updatedOffer, customerId, {
      type: 'OFFER_CUSTOMER_COUNTERED',
      action: 'customer_countered',
      title: 'Customer Counter Offer',
      message: `${updatedOffer.customer.fullName} sent a new counter offer.`,
      payload: {
        status: updatedOffer.status,
        customerPrice: updatedOffer.customerPrice,
      },
    });

    this.publishOfferRealtimeToParticipants(updatedOffer, 'customer_countered', customerId, {
      status: updatedOffer.status,
      customerPrice: updatedOffer.customerPrice,
      awaitingResponseFrom: updatedOffer.awaitingResponseFrom,
    });

    return updatedOffer;
  }

  /**
   * Customer accepts designer's counter offer
   */
  async acceptCounterOffer(offerId: string, customerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { design: { select: { productionSteps: true } } },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.customerId !== customerId) {
      throw new Error('Unauthorized to accept this offer');
    }

    if (offer.status !== OfferStatus.COUNTERED) {
      throw new Error(`Cannot accept counter offer with status: ${offer.status}`);
    }

    if (!offer.designerPrice) {
      throw new Error('No designer counter offer to accept');
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

    // Accept at designer's price
    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.ACCEPTED,
        finalPrice: offer.designerPrice,
        acceptedAt: new Date(),
        awaitingResponseFrom: null, // Negotiation complete
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

    await this.notifyCounterparty(updatedOffer, customerId, {
      type: 'OFFER_COUNTER_ACCEPTED',
      action: 'counter_accepted',
      title: 'Counter Offer Accepted',
      message: `${updatedOffer.customer.fullName} accepted your counter offer.`,
      payload: {
        status: updatedOffer.status,
      },
    });

    this.publishOfferRealtimeToParticipants(updatedOffer, 'counter_accepted', customerId, {
      status: updatedOffer.status,
      finalPrice: updatedOffer.finalPrice,
    });

    return updatedOffer;
  }

  /**
   * Customer declines designer's counter offer (ends negotiation)
   */
  async declineCounterOffer(offerId: string, customerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.customerId !== customerId) {
      throw new Error('Unauthorized to decline this offer');
    }

    if (offer.status !== OfferStatus.COUNTERED) {
      throw new Error(`Cannot decline offer with status: ${offer.status}`);
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.REJECTED,
        awaitingResponseFrom: null, // Negotiation ended
      },
      include: {
        customer: true,
        designer: true,
        design: true,
      },
    });

    await this.notifyCounterparty(updatedOffer, customerId, {
      type: 'OFFER_COUNTER_DECLINED',
      action: 'counter_declined',
      title: 'Counter Offer Declined',
      message: `${updatedOffer.customer.fullName} declined your counter offer.`,
      payload: {
        status: updatedOffer.status,
      },
    });

    this.publishOfferRealtimeToParticipants(updatedOffer, 'counter_declined', customerId, {
      status: updatedOffer.status,
      awaitingResponseFrom: updatedOffer.awaitingResponseFrom,
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
        awaitingResponseFrom: null, // Negotiation ended
      },
      include: {
        customer: true,
        designer: true,
        design: true,
      },
    });

    await this.notifyCounterparty(updatedOffer, designerId, {
      type: 'OFFER_REJECTED',
      action: 'offer_rejected',
      title: 'Offer Rejected',
      message: `${updatedOffer.designer.brandName || updatedOffer.designer.fullName} rejected your offer.`,
      payload: {
        status: updatedOffer.status,
      },
    });

    this.publishOfferRealtimeToParticipants(updatedOffer, 'offer_rejected', designerId, {
      status: updatedOffer.status,
      awaitingResponseFrom: updatedOffer.awaitingResponseFrom,
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

    await this.notifyCounterparty(updatedOffer, customerId, {
      type: 'OFFER_WITHDRAWN',
      action: 'offer_withdrawn',
      title: 'Offer Withdrawn',
      message: `${updatedOffer.customer.fullName} withdrew this offer.`,
      payload: {
        status: updatedOffer.status,
      },
    });

    this.publishOfferRealtimeToParticipants(updatedOffer, 'offer_withdrawn', customerId, {
      status: updatedOffer.status,
    });

    return updatedOffer;
  }

  /**
   * Get customer measurements for an offer (Designer can view)
   */
  async getOfferMeasurements(offerId: string, userId: string) {
    // Verify offer exists and user is authorized
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        designerId: true,
        customerId: true,
      },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    // Only designer or the customer can view measurements
    if (offer.designerId !== userId && offer.customerId !== userId) {
      throw new Error('Unauthorized to view measurements for this offer');
    }

    // Get the customer's active measurements
    const measurements = await prisma.bodyMeasurement.findFirst({
      where: {
        userId: offer.customerId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return measurements;
  }
}

export default new OfferService();
