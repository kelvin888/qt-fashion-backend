import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { notificationService } from '../services/notification.service';
import { realtimeEventService } from '../services/realtime-event.service';

const prisma = new PrismaClient();

const utcStartOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const addDaysUtc = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const notifyAndBroadcastCustomRequest = async ({
  recipientUserId,
  actorUserId,
  type,
  action,
  requestId,
  title,
  message,
  payload,
}: {
  recipientUserId: string;
  actorUserId?: string;
  type: string;
  action: string;
  requestId: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}) => {
  await notificationService.notifyUser({
    userId: recipientUserId,
    type,
    title,
    message,
    data: {
      requestId,
      ...(payload || {}),
    },
    realtime: {
      domain: 'custom_request',
      action,
      entityId: requestId,
      actorUserId,
      payload: {
        requestId,
        ...(payload || {}),
      },
    },
  });
};

/**
 * Create a new custom request
 * POST /api/custom-requests
 */
export const createCustomRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      category,
      referenceImages,
      budget,
      deadline,
      requirements,
      measurements,
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !measurements) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, category, measurements',
      });
    }

    // Validate measurements
    // Universal measurements required for all users
    const universalMeasurements = [
      'waist',
      'hips',
      'height',
      'shoulder',
      'armLength',
      'inseam',
      'neck',
    ];

    const missingUniversalMeasurements = universalMeasurements.filter((m) => !measurements[m]);
    if (missingUniversalMeasurements.length > 0) {
      return res.status(400).json({
        error: `Missing required measurements: ${missingUniversalMeasurements.join(', ')}`,
      });
    }

    // Validate torso measurements (either chest OR bust must be provided)
    if (!measurements.chest && !measurements.bust) {
      return res.status(400).json({
        error: 'Either chest or bust measurement is required',
      });
    }

    // Validate deadline (must be at least 6 days: 3 days production + 3 days shipping)
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const sixDaysFromNow = new Date();
      sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);

      if (deadlineDate < sixDaysFromNow) {
        return res.status(400).json({
          error:
            'Deadline must be at least 6 days from now to allow time for production and shipping',
        });
      }
    }

    const customRequest = await prisma.customRequest.create({
      data: {
        customerId: userId,
        title,
        description,
        category,
        referenceImages: referenceImages || [],
        budget: budget ? parseFloat(budget) : null,
        deadline: deadline ? new Date(deadline) : null,
        requirements,
        measurements,
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
      },
    });

    res.status(201).json(customRequest);
  } catch (error: any) {
    console.error('Error creating custom request:', error);
    res.status(500).json({ error: 'Failed to create custom request' });
  }
};

/**
 * Get all custom requests (for designers to browse)
 * GET /api/custom-requests?status=OPEN&category=WEDDING
 */
export const getAllCustomRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, category, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [requests, total] = await Promise.all([
      prisma.customRequest.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
          bids: {
            where: {
              OR: [{ status: 'ACCEPTED' }, ...(userId ? [{ designerId: userId }] : [])],
            },
            select: {
              id: true,
              status: true,
              designerId: true,
            },
          },
          _count: {
            select: { bids: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.customRequest.count({ where }),
    ]);

    res.json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching custom requests:', error);
    res.status(500).json({ error: 'Failed to fetch custom requests' });
  }
};

/**
 * Get customer's own custom requests
 * GET /api/custom-requests/my-requests
 */
export const getMyCustomRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requests = await prisma.customRequest.findMany({
      where: { customerId: userId },
      include: {
        _count: {
          select: { bids: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching user custom requests:', error);
    res.status(500).json({ error: 'Failed to fetch your custom requests' });
  }
};

/**
 * Get single custom request by ID
 * GET /api/custom-requests/:id
 */
export const getCustomRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const customRequest = await prisma.customRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        bids: {
          include: {
            designer: {
              select: {
                id: true,
                fullName: true,
                brandName: true,
                brandLogo: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    // If the requesting user is the owning customer, include a paymentOfferId so
    // the client can continue payment after accepting a bid.
    let paymentOfferId: string | null = null;
    if (userId && customRequest.customerId === userId) {
      const offer = await prisma.offer.findFirst({
        where: {
          customerId: userId,
          notes: { startsWith: `CUSTOM_REQUEST_ID:${id}` },
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      });

      paymentOfferId = offer?.id ?? null;
    }

    res.json({
      ...customRequest,
      paymentOfferId,
    });
  } catch (error: any) {
    console.error('Error fetching custom request:', error);
    res.status(500).json({ error: 'Failed to fetch custom request' });
  }
};

/**
 * Update custom request (close, cancel, etc.)
 * PATCH /api/custom-requests/:id
 */
export const updateCustomRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Verify ownership
    const existingRequest = await prisma.customRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    if (existingRequest.customerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this request' });
    }

    const participantBids = await prisma.customRequestBid.findMany({
      where: { requestId: id },
      select: {
        designerId: true,
      },
    });

    const updatedRequest = await prisma.customRequest.update({
      where: { id },
      data: {
        status,
        closedAt: status === 'CLOSED' || status === 'CANCELLED' ? new Date() : undefined,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    });

    const recipientDesignerIds = Array.from(new Set(participantBids.map((bid) => bid.designerId)));
    const shouldNotifyDesigners = status === 'CLOSED' || status === 'CANCELLED';

    if (shouldNotifyDesigners) {
      await Promise.allSettled(
        recipientDesignerIds.map((designerId) =>
          notifyAndBroadcastCustomRequest({
            recipientUserId: designerId,
            actorUserId: userId,
            type: 'CUSTOM_REQUEST_STATUS_CHANGED',
            action: 'status_changed',
            requestId: id,
            title: 'Custom Request Updated',
            message: `"${existingRequest.title}" is now ${status.toLowerCase()}.`,
            payload: {
              status,
            },
          })
        )
      );
    }

    realtimeEventService.publishToUsers([userId, ...recipientDesignerIds], {
      type: 'CUSTOM_REQUEST_STATUS_CHANGED',
      domain: 'custom_request',
      action: 'status_changed',
      entityId: id,
      actorUserId: userId,
      payload: {
        requestId: id,
        status,
      },
    });

    res.json(updatedRequest);
  } catch (error: any) {
    console.error('Error updating custom request:', error);
    res.status(500).json({ error: 'Failed to update custom request' });
  }
};

/**
 * Submit a bid on a custom request (designers only)
 * POST /api/custom-requests/:id/bids
 */
export const submitBid = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is a designer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'DESIGNER') {
      return res.status(403).json({ error: 'Only designers can submit bids' });
    }

    const { id: requestId } = req.params;
    const { price, timeline, pitch, portfolioImages, canMeetDeadline, deadlineNotes } = req.body;

    // Validate required fields
    if (!price || !timeline || !pitch) {
      return res.status(400).json({
        error: 'Missing required fields: price, timeline, pitch',
      });
    }

    // Check if request exists and is open
    const customRequest = await prisma.customRequest.findUnique({
      where: { id: requestId },
    });

    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    if (customRequest.status !== 'OPEN') {
      return res.status(400).json({ error: 'This request is no longer accepting bids' });
    }

    // Validate timeline as date
    let completionDate: Date;
    try {
      completionDate = new Date(timeline);
      if (isNaN(completionDate.getTime())) {
        return res.status(400).json({ error: 'Invalid completion date format' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid completion date format' });
    }

    // Validate completion date is at least 3 days from now
    const completionDay = utcStartOfDay(completionDate);
    const minCompletionDay = addDaysUtc(utcStartOfDay(new Date()), 3);
    if (completionDay.getTime() < minCompletionDay.getTime()) {
      return res.status(400).json({
        error: 'Completion date must be at least 3 days from now',
      });
    }

    // Infer whether the bid meets the customer's deadline based on the proposed completion date.
    // We keep (but do not require) the canMeetDeadline field for backwards compatibility.
    let computedCanMeetDeadline: boolean | null = null;
    if (customRequest.deadline) {
      const requestDeadlineDay = utcStartOfDay(new Date(customRequest.deadline));
      const deliveryDay = addDaysUtc(completionDay, 3); // Add 3 days for shipping
      computedCanMeetDeadline = deliveryDay.getTime() <= requestDeadlineDay.getTime();
    }

    // Check if designer already submitted a bid
    const existingBid = await prisma.customRequestBid.findUnique({
      where: {
        requestId_designerId: {
          requestId,
          designerId: userId,
        },
      },
    });

    if (existingBid) {
      return res.status(400).json({ error: 'You have already submitted a bid for this request' });
    }

    // Create the bid
    const bid = await prisma.customRequestBid.create({
      data: {
        requestId,
        designerId: userId,
        price: parseFloat(price),
        timeline,
        pitch,
        portfolioImages: portfolioImages || [],
        canMeetDeadline: computedCanMeetDeadline,
        deadlineNotes: deadlineNotes || null,
      },
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            profileImage: true,
          },
        },
      },
    });

    await notifyAndBroadcastCustomRequest({
      recipientUserId: customRequest.customerId,
      actorUserId: userId,
      type: 'CUSTOM_REQUEST_NEW_BID',
      action: 'bid_submitted',
      requestId,
      title: 'New Bid Received',
      message: `You received a new bid for "${customRequest.title}".`,
      payload: {
        bidId: bid.id,
        designerId: userId,
      },
    });

    realtimeEventService.publishToUser(userId, {
      type: 'CUSTOM_REQUEST_BID_SUBMITTED',
      domain: 'custom_request',
      action: 'bid_submitted',
      entityId: requestId,
      actorUserId: userId,
      payload: {
        requestId,
        bidId: bid.id,
      },
    });

    res.status(201).json(bid);
  } catch (error: any) {
    console.error('Error submitting bid:', error);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
};

/**
 * Update a designer's bid on a custom request
 * PATCH /api/custom-requests/:requestId/bids/:bidId
 */
export const updateBid = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId, bidId } = req.params;
    const { price, timeline, pitch, portfolioImages, deadlineNotes } = req.body;

    const customRequest = await prisma.customRequest.findUnique({ where: { id: requestId } });
    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    if (customRequest.status !== 'OPEN') {
      return res.status(400).json({ error: 'This request is no longer accepting bid updates' });
    }

    const existingBid = await prisma.customRequestBid.findUnique({ where: { id: bidId } });
    if (!existingBid || existingBid.requestId !== requestId) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (existingBid.designerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this bid' });
    }

    if (existingBid.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending bids can be updated' });
    }

    if (!price || !timeline || !pitch) {
      return res.status(400).json({
        error: 'Missing required fields: price, timeline, pitch',
      });
    }

    let completionDate: Date;
    try {
      completionDate = new Date(timeline);
      if (isNaN(completionDate.getTime())) {
        return res.status(400).json({ error: 'Invalid completion date format' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid completion date format' });
    }

    const completionDay = utcStartOfDay(completionDate);
    const minCompletionDay = addDaysUtc(utcStartOfDay(new Date()), 3);
    if (completionDay.getTime() < minCompletionDay.getTime()) {
      return res.status(400).json({
        error: 'Completion date must be at least 3 days from now',
      });
    }

    let computedCanMeetDeadline: boolean | null = null;
    if (customRequest.deadline) {
      const requestDeadlineDay = utcStartOfDay(new Date(customRequest.deadline));
      const deliveryDay = addDaysUtc(completionDay, 3);
      computedCanMeetDeadline = deliveryDay.getTime() <= requestDeadlineDay.getTime();
    }

    const updatedBid = await prisma.customRequestBid.update({
      where: { id: bidId },
      data: {
        price: parseFloat(price),
        timeline,
        pitch,
        portfolioImages: portfolioImages || [],
        deadlineNotes: deadlineNotes || null,
        canMeetDeadline: computedCanMeetDeadline,
      },
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            profileImage: true,
          },
        },
      },
    });

    await notifyAndBroadcastCustomRequest({
      recipientUserId: customRequest.customerId,
      actorUserId: userId,
      type: 'CUSTOM_REQUEST_BID_UPDATED',
      action: 'bid_updated',
      requestId,
      title: 'Bid Updated',
      message: `A designer updated their bid for "${customRequest.title}".`,
      payload: {
        bidId,
      },
    });

    realtimeEventService.publishToUser(userId, {
      type: 'CUSTOM_REQUEST_BID_UPDATED',
      domain: 'custom_request',
      action: 'bid_updated',
      entityId: requestId,
      actorUserId: userId,
      payload: {
        requestId,
        bidId,
      },
    });

    res.json(updatedBid);
  } catch (error: any) {
    console.error('Error updating bid:', error);
    res.status(500).json({ error: 'Failed to update bid' });
  }
};

/**
 * Withdraw a designer's pending bid from a custom request
 * DELETE /api/custom-requests/:requestId/bids/:bidId
 */
export const withdrawBid = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId, bidId } = req.params;

    const customRequest = await prisma.customRequest.findUnique({ where: { id: requestId } });
    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    const existingBid = await prisma.customRequestBid.findUnique({ where: { id: bidId } });
    if (!existingBid || existingBid.requestId !== requestId) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (existingBid.designerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to withdraw this bid' });
    }

    if (existingBid.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending bids can be withdrawn' });
    }

    await prisma.customRequestBid.delete({ where: { id: bidId } });

    await notifyAndBroadcastCustomRequest({
      recipientUserId: customRequest.customerId,
      actorUserId: userId,
      type: 'CUSTOM_REQUEST_BID_WITHDRAWN',
      action: 'bid_withdrawn',
      requestId,
      title: 'Bid Withdrawn',
      message: `A designer withdrew their bid for "${customRequest.title}".`,
      payload: {
        bidId,
      },
    });

    realtimeEventService.publishToUser(userId, {
      type: 'CUSTOM_REQUEST_BID_WITHDRAWN',
      domain: 'custom_request',
      action: 'bid_withdrawn',
      entityId: requestId,
      actorUserId: userId,
      payload: {
        requestId,
        bidId,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error withdrawing bid:', error);
    res.status(500).json({ error: 'Failed to withdraw bid' });
  }
};

/**
 * Get bids for a custom request
 * GET /api/custom-requests/:id/bids
 */
export const getBidsForRequest = async (req: Request, res: Response) => {
  try {
    const { id: requestId } = req.params;

    // Get the request to check if it has a deadline
    const customRequest = await prisma.customRequest.findUnique({
      where: { id: requestId },
      select: { deadline: true },
    });

    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    const where: any = { requestId };

    const orderBy: any = customRequest.deadline
      ? [{ canMeetDeadline: 'desc' }, { createdAt: 'desc' }]
      : { createdAt: 'desc' };

    const bids = await prisma.customRequestBid.findMany({
      where,
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            profileImage: true,
            bio: true,
          },
        },
      },
      orderBy,
    });

    res.json(bids);
  } catch (error: any) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
};

/**
 * Accept a bid (customer only)
 * POST /api/custom-requests/:requestId/bids/:bidId/accept
 */
export const acceptBid = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId, bidId } = req.params;

    // Verify the request belongs to the user
    const customRequest = await prisma.customRequest.findUnique({
      where: { id: requestId },
      include: { bids: true },
    });

    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    if (customRequest.customerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept bids for this request' });
    }

    if (customRequest.status !== 'OPEN') {
      return res.status(400).json({ error: 'This request is no longer open' });
    }

    // Verify the bid exists and belongs to this request
    const bid = await prisma.customRequestBid.findUnique({
      where: { id: bidId },
    });

    if (!bid || bid.requestId !== requestId) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // For custom requests with a deadline, treat Offer.deadline as the expected delivery date
    // (completion date + 3 days shipping) for the accepted bid.
    let offerDeadline: Date | null = customRequest.deadline
      ? new Date(customRequest.deadline)
      : null;
    if (customRequest.deadline) {
      const bidCompletionDate = new Date(bid.timeline);
      if (!isNaN(bidCompletionDate.getTime())) {
        const completionDayUtc = new Date(
          Date.UTC(
            bidCompletionDate.getUTCFullYear(),
            bidCompletionDate.getUTCMonth(),
            bidCompletionDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        offerDeadline = new Date(completionDayUtc.getTime() + 3 * 24 * 60 * 60 * 1000);
      }
    }

    // Update in transaction: accept bid, reject others, update request status
    const result = await prisma.$transaction(async (tx) => {
      // Accept the selected bid
      const acceptedBid = await tx.customRequestBid.update({
        where: { id: bidId },
        data: { status: 'ACCEPTED' },
      });

      // Reject all other bids
      await tx.customRequestBid.updateMany({
        where: {
          requestId,
          id: { not: bidId },
        },
        data: { status: 'REJECTED' },
      });

      // Update request status to IN_PROGRESS and link selected bid
      const updatedRequest = await tx.customRequest.update({
        where: { id: requestId },
        data: {
          status: 'IN_PROGRESS',
          selectedBidId: bidId,
        },
        include: {
          selectedBid: {
            include: {
              designer: {
                select: {
                  id: true,
                  fullName: true,
                  brandName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Create an internal "custom design" + accepted offer so the customer can pay
      // using the existing Offer -> Payment -> Order pipeline.
      const defaultProductionSteps = [
        { id: 'step-1', title: 'Confirm measurements', estimatedTime: '1 day', description: '' },
        { id: 'step-2', title: 'Sourcing materials', estimatedTime: '2 days', description: '' },
        {
          id: 'step-3',
          title: 'Cutting & preparation',
          estimatedTime: '1-2 days',
          description: '',
        },
        { id: 'step-4', title: 'Sewing & assembly', estimatedTime: '3-5 days', description: '' },
        {
          id: 'step-5',
          title: 'Finishing & quality check',
          estimatedTime: '1-2 days',
          description: '',
        },
        {
          id: 'step-6',
          title: 'Packaging & delivery prep',
          estimatedTime: '1 day',
          description: '',
        },
      ];

      const customDesign = await tx.design.create({
        data: {
          designerId: acceptedBid.designerId,
          title: `Custom Order: ${customRequest.title}`,
          description: customRequest.description,
          price: acceptedBid.price,
          images: customRequest.referenceImages || [],
          category: customRequest.category,
          colors: [],
          sizes: [],
          customizable: true,
          productionSteps: defaultProductionSteps as any,
        },
      });

      const offerNotes = `CUSTOM_REQUEST_ID:${customRequest.id}\n${customRequest.description}`;

      const offer = await tx.offer.create({
        data: {
          customerId: customRequest.customerId,
          designerId: acceptedBid.designerId,
          designId: customDesign.id,
          status: 'ACCEPTED',
          customerPrice: acceptedBid.price,
          finalPrice: acceptedBid.price,
          measurements: customRequest.measurements as any,
          notes: offerNotes,
          designerNotes: acceptedBid.pitch,
          acceptedAt: new Date(),
          deadline: offerDeadline,
        },
        include: {
          design: {
            select: {
              id: true,
              title: true,
              images: true,
              category: true,
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
        },
      });

      return { acceptedBid, updatedRequest, offer };
    });

    const rejectedDesignerIds = Array.from(
      new Set(
        customRequest.bids
          .filter((existingBid) => existingBid.id !== bidId)
          .map((existingBid) => existingBid.designerId)
      )
    );

    await Promise.allSettled([
      notifyAndBroadcastCustomRequest({
        recipientUserId: result.acceptedBid.designerId,
        actorUserId: userId,
        type: 'CUSTOM_REQUEST_BID_ACCEPTED',
        action: 'bid_accepted',
        requestId,
        title: 'Bid Accepted',
        message: `Your bid for "${customRequest.title}" was accepted.`,
        payload: {
          bidId,
          offerId: result.offer.id,
        },
      }),
      notifyAndBroadcastCustomRequest({
        recipientUserId: userId,
        actorUserId: userId,
        type: 'CUSTOM_REQUEST_PAYMENT_READY',
        action: 'payment_ready',
        requestId,
        title: 'Proceed to Payment',
        message: `Your selected bid for "${customRequest.title}" is ready for payment.`,
        payload: {
          bidId,
          offerId: result.offer.id,
        },
      }),
      ...rejectedDesignerIds.map((designerId) =>
        notifyAndBroadcastCustomRequest({
          recipientUserId: designerId,
          actorUserId: userId,
          type: 'CUSTOM_REQUEST_BID_REJECTED',
          action: 'bid_rejected',
          requestId,
          title: 'Bid Not Selected',
          message: `Another bid was selected for "${customRequest.title}".`,
          payload: {
            bidId,
          },
        })
      ),
    ]);

    realtimeEventService.publishToUsers(
      [userId, ...rejectedDesignerIds, result.acceptedBid.designerId],
      {
        type: 'CUSTOM_REQUEST_STATUS_CHANGED',
        domain: 'custom_request',
        action: 'status_changed',
        entityId: requestId,
        actorUserId: userId,
        payload: {
          requestId,
          status: 'IN_PROGRESS',
          selectedBidId: bidId,
        },
      }
    );

    // Backwards-compatible response shape: keep top-level fields and also provide
    // a stable wrapper for newer clients.
    res.json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error: any) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
};

/**
 * Get designer's own bids
 * GET /api/custom-requests/my-bids
 */
export const getMyBids = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bids = await prisma.customRequestBid.findMany({
      where: { designerId: userId },
      include: {
        request: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bids);
  } catch (error: any) {
    console.error('Error fetching designer bids:', error);
    res.status(500).json({ error: 'Failed to fetch your bids' });
  }
};
